"""Train the laptop price model and export it for the web app.

The website does not run scikit-learn. It reloads this model as plain numbers:
the intercept, every StandardScaler mean/scale, and every one-hot coefficient.
A prediction is then just  intercept + sum(coef * scaled_value), which the
browser can do with arithmetic.

Run this whenever the dataset, the cleaning, or the feature list changes:

    python export_model.py

Dataset: laptops_india.csv - 991 Indian laptop listings, price in rupees (INR).
"""

import json
import os

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

HERE = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(HERE, "laptops_india.csv")
OUT_PATH = os.path.join(HERE, "web", "src", "data", "modelData.json")

TARGET = "Price"
CURRENCY = "INR"

# 15 inputs. Thread count and secondary storage were dropped after testing:
# threads track core count, and 98% of the rows have no secondary drive, so
# neither changed the test score (R2 0.877 either way).
NUMERIC_FEATURES = [
    "ram_memory",
    "primary_storage_capacity",
    "num_cores",
    "display_size",
    "resolution_width",
    "resolution_height",
    "is_touch",
]
CATEGORICAL_FEATURES = [
    "brand",
    "processor_brand",
    "processor_tier",
    "primary_storage_type",
    "gpu_brand",
    "gpu_type",
    "OS",
    "year_of_warranty",
]

# Dataset column -> the key the web app uses for it.
SPEC_KEYS = {
    "brand": "brand",
    "processor_brand": "processorBrand",
    "processor_tier": "processorTier",
    "num_cores": "cores",
    "ram_memory": "ram",
    "primary_storage_capacity": "storage",
    "primary_storage_type": "storageType",
    "gpu_brand": "gpuBrand",
    "gpu_type": "gpuType",
    "display_size": "display",
    "resolution_width": "resWidth",
    "resolution_height": "resHeight",
    "OS": "os",
    "year_of_warranty": "warranty",
}


def load_and_clean():
    df = pd.read_csv(CSV_PATH)

    # "index" is a row id, and "Model" is the listing title shown in the UI
    # rather than a feature. Rating is excluded too: adding it lowered the
    # test score, and a buyer pricing a laptop by its specs has no rating yet.
    df = df.drop(columns=["index"])
    df = df.drop_duplicates()

    df["is_touch"] = df["is_touch_screen"].astype(int)
    # One listing in four says "No information" for warranty, so warranty stays
    # categorical instead of being forced to a number.
    df["year_of_warranty"] = df["year_of_warranty"].astype(str)

    df = df.dropna(subset=NUMERIC_FEATURES + CATEGORICAL_FEATURES + [TARGET])
    return df.reset_index(drop=True)


def build_pipeline():
    pre = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_FEATURES),
            # drop="first" removes one category per feature to avoid collinearity;
            # the dropped category is absorbed into the intercept (coefficient 0).
            ("cat", OneHotEncoder(handle_unknown="ignore", drop="first"), CATEGORICAL_FEATURES),
        ]
    )
    return Pipeline([("prep", pre), ("model", LinearRegression())])


def flatten_coefficients(pipe):
    """Pull the fitted pipeline apart into JSON the browser can score with."""
    pre = pipe.named_steps["prep"]
    coefs = pipe.named_steps["model"].coef_
    scaler = pre.named_transformers_["num"]
    ohe = pre.named_transformers_["cat"]

    numeric = {
        name: {
            "coef": float(coefs[i]),
            "mean": float(scaler.mean_[i]),
            "scale": float(scaler.scale_[i]),
        }
        for i, name in enumerate(NUMERIC_FEATURES)
    }

    categorical = {}
    offset = len(NUMERIC_FEATURES)
    for f_idx, feature in enumerate(CATEGORICAL_FEATURES):
        cats = list(ohe.categories_[f_idx])
        dropped, kept = cats[0], cats[1:]
        block = {str(dropped): 0.0}
        for k_idx, cat in enumerate(kept):
            block[str(cat)] = float(coefs[offset + k_idx])
        offset += len(kept)
        categorical[feature] = {"baseline": str(dropped), "coefs": block}

    return numeric, categorical


def build_options(df):
    """Dropdown choices for the UI, taken straight from the data."""
    options = {
        SPEC_KEYS[col]: sorted(df[col].astype(str).unique().tolist())
        for col in CATEGORICAL_FEATURES
    }
    for col in ["ram_memory", "primary_storage_capacity", "num_cores", "display_size"]:
        options[SPEC_KEYS[col]] = sorted(df[col].unique().tolist())

    # Resolution is two columns in the data but one dropdown in the UI.
    pairs = df[["resolution_width", "resolution_height"]].value_counts().index
    options["resolution"] = [
        {"label": f"{w} x {h}", "width": int(w), "height": int(h)} for w, h in pairs
    ]
    options["touch"] = ["No", "Yes"]
    return options


def build_laptops(df):
    laptops = []
    for i, row in df.iterrows():
        laptop = {"id": int(i), "name": str(row["Model"])}
        for col, key in SPEC_KEYS.items():
            value = row[col]
            laptop[key] = float(value) if col == "display_size" else (
                int(value) if col in ("num_cores", "ram_memory", "primary_storage_capacity",
                                      "resolution_width", "resolution_height") else str(value)
            )
        laptop["touch"] = "Yes" if row["is_touch"] else "No"
        laptop["actualPrice"] = float(row[TARGET])
        laptops.append(laptop)
    return laptops


def main():
    df = load_and_clean()
    X, y = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES], df[TARGET]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    pipe = build_pipeline()
    pipe.fit(X_train, y_train)
    predictions = pipe.predict(X_test)

    metrics = {
        "mae": round(float(mean_absolute_error(y_test, predictions)), 2),
        "r2": round(float(r2_score(y_test, predictions)), 3),
        "cvR2": round(float(cross_val_score(pipe, X, y, cv=5, scoring="r2").mean()), 3),
        "rows": int(len(df)),
        "trainRows": int(len(X_train)),
        "testRows": int(len(X_test)),
    }

    numeric, categorical = flatten_coefficients(pipe)
    out = {
        "currency": CURRENCY,
        "intercept": float(pipe.named_steps["model"].intercept_),
        "numeric": numeric,
        "categorical": categorical,
        "numericFeatures": NUMERIC_FEATURES,
        "categoricalFeatures": CATEGORICAL_FEATURES,
        "metrics": metrics,
        "options": build_options(df),
        "laptops": build_laptops(df),
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f)

    # Sanity check: the arithmetic the browser does must match scikit-learn.
    def manual_predict(record):
        total = out["intercept"]
        for name, info in numeric.items():
            total += info["coef"] * ((record[name] - info["mean"]) / info["scale"])
        for name, block in categorical.items():
            total += block["coefs"].get(str(record[name]), 0.0)
        return total

    sample = X_test.iloc[0].to_dict()
    print(f"rows: {metrics['rows']} | train {metrics['trainRows']} / test {metrics['testRows']}")
    print(f"test MAE: Rs {metrics['mae']:,.2f} | test R2: {metrics['r2']} | 5-fold CV R2: {metrics['cvR2']}")
    print(f"sklearn: {pipe.predict(X_test.iloc[[0]])[0]:.2f} | manual: {manual_predict(sample):.2f}")
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
