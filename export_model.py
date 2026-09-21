"""
Exports the trained Linear Regression model (from Eda_Project_Batch_14.ipynb)
into a plain JSON file so the React frontend can compute predictions with
simple arithmetic -- no ML library needed in the browser.

Output: web/src/data/modelData.json
"""

import json
import os

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(HERE, "web", "src", "data", "modelData.json")

# ---------------------------------------------------------------- 1. load
df = pd.read_csv(os.path.join(HERE, "laptops.csv"))

# notebook works on snake_case columns
df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

# ---------------------------------------------------------------- 2. clean
# GPU is blank for machines with integrated graphics
df["gpu"] = df["gpu"].fillna("Integrated")
df["storage_type"] = df["storage_type"].fillna("SSD")
df["model"] = df["model"].fillna("Unknown")
df = df.dropna(subset=["final_price", "ram", "storage", "screen"])
df = df.drop_duplicates().reset_index(drop=True)

# ---------------------------------------------------------------- 3. features
df["ram_gb"] = df["ram"]
df["storage_gb"] = df["storage"]
df["screen_size"] = df["screen"]
df["is_ssd"] = (df["storage_type"] == "SSD").astype(int)
df["is_touch"] = (df["touch"] == "Yes").astype(int)
df["is_new"] = (df["status"] == "New").astype(int)
df["has_discrete_gpu"] = (df["gpu"] != "Integrated").astype(int)

categorical_features = ["brand", "cpu", "gpu", "storage_type", "status", "touch"]
numerical_features = [
    "ram_gb",
    "storage_gb",
    "screen_size",
    "is_ssd",
    "is_touch",
    "is_new",
    "has_discrete_gpu",
]
feature_columns = categorical_features + numerical_features

X = df[feature_columns]
y = df["final_price"]

# ---------------------------------------------------------------- 4. train
preprocessor = ColumnTransformer(
    transformers=[
        ("num", StandardScaler(), numerical_features),
        ("cat", OneHotEncoder(handle_unknown="ignore", drop="first"), categorical_features),
    ]
)

model = Pipeline([("preprocessor", preprocessor), ("model", LinearRegression())])

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42)
model.fit(X_train, y_train)

pred_test = model.predict(X_test)
metrics = {
    "mae": round(float(mean_absolute_error(y_test, pred_test)), 2),
    "r2": round(float(r2_score(y_test, pred_test)), 3),
    "trainRows": int(len(X_train)),
    "testRows": int(len(X_test)),
}
print("Test MAE:", metrics["mae"], " R2:", metrics["r2"])

# ---------------------------------------------------------------- 5. flatten
scaler = model.named_steps["preprocessor"].named_transformers_["num"]
ohe = model.named_steps["preprocessor"].named_transformers_["cat"]
lr = model.named_steps["model"]

coefs = lr.coef_
intercept = float(lr.intercept_)

# Coefficients come out in the same order the ColumnTransformer emits columns:
# all scaled numerics first, then the one-hot blocks in `categorical_features` order.
numeric_coefs = {
    name: {
        "coef": float(coefs[i]),
        "mean": float(scaler.mean_[i]),
        "scale": float(scaler.scale_[i]),
    }
    for i, name in enumerate(numerical_features)
}

# OneHotEncoder(drop="first") drops each feature's first category -> its coef is 0
categorical_coefs = {}
offset = len(numerical_features)
for f_idx, feature in enumerate(categorical_features):
    cats = list(ohe.categories_[f_idx])
    dropped = cats[0]
    kept = cats[1:]
    block = {dropped: 0.0}
    for k_idx, cat in enumerate(kept):
        block[str(cat)] = float(coefs[offset + k_idx])
    offset += len(kept)
    categorical_coefs[feature] = {
        "baseline": str(dropped),
        "coefs": {str(k): v for k, v in block.items()},
    }

# ---------------------------------------------------------------- 6. laptops
df["predicted_price"] = model.predict(X)

laptops = []
for i, row in df.iterrows():
    laptops.append(
        {
            "id": int(i),
            "name": str(row["laptop"])[:90],
            "brand": str(row["brand"]),
            "model": str(row["model"]),
            "cpu": str(row["cpu"]),
            "ram": int(row["ram_gb"]),
            "storage": int(row["storage_gb"]),
            "storageType": str(row["storage_type"]),
            "gpu": str(row["gpu"]),
            "screen": float(row["screen_size"]),
            "touch": str(row["touch"]),
            "status": str(row["status"]),
            "actualPrice": round(float(row["final_price"]), 2),
        }
    )

options = {
    "brand": sorted(df["brand"].unique().tolist()),
    "cpu": sorted(df["cpu"].unique().tolist()),
    "gpu": sorted(df["gpu"].unique().tolist()),
    "storageType": sorted(df["storage_type"].unique().tolist()),
    "status": sorted(df["status"].unique().tolist()),
    "touch": ["No", "Yes"],
}

# Feature importance = how much price swings across each feature's observed range.
# For numerics: |coef / scale| * (max - min). For categoricals: spread of coefs.
importance = {}
for name, info in numeric_coefs.items():
    span = float(df[name].max() - df[name].min())
    importance[name] = abs(info["coef"] / info["scale"]) * span
for feature, block in categorical_coefs.items():
    vals = list(block["coefs"].values())
    importance[feature] = float(max(vals) - min(vals))

out = {
    "intercept": intercept,
    "numeric": numeric_coefs,
    "categorical": categorical_coefs,
    "numericFeatures": numerical_features,
    "categoricalFeatures": categorical_features,
    "metrics": metrics,
    "importance": {k: round(v, 2) for k, v in importance.items()},
    "options": options,
    "laptops": laptops,
}

os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(out, f)

# sanity check: JS-style manual prediction must match sklearn
def manual_predict(rec):
    total = intercept
    for name, info in numeric_coefs.items():
        total += info["coef"] * ((rec[name] - info["mean"]) / info["scale"])
    for feature, block in categorical_coefs.items():
        total += block["coefs"].get(str(rec[feature]), 0.0)
    return total


sample = df.iloc[0]
rec = {n: sample[n] for n in numerical_features}
rec.update({c: sample[c] for c in categorical_features})
print("sklearn :", round(float(sample["predicted_price"]), 2))
print("manual  :", round(manual_predict(rec), 2))
print("Wrote", OUT_PATH, f"({len(laptops)} laptops)")
