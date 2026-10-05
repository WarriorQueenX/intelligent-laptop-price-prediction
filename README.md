# Intelligent Laptop Price Prediction and Value Analysis Using Machine Learning

> **Beyond price prediction — explainable, fair-value decision support for laptop buyers**

## Project Overview

Laptop prices vary considerably across brands and configurations due to differences in processor, RAM, storage, GPU, display, operating system, warranty, and other specifications. For buyers, it can be difficult to determine whether a listed price is reasonable for the specifications offered.

This project develops an intelligent laptop price analysis system that goes beyond simply predicting a price. It combines:

- Exploratory Data Analysis (EDA)
- Data cleaning and preprocessing
- Feature engineering
- Multiple regression models
- Model evaluation
- Feature importance and explainability
- Fair-price estimation
- Value assessment

The final system estimates an expected/fair price for a laptop and compares it with its listed price to provide a value indication:

- **Potentially Underpriced**
- **Fairly Priced**
- **Potentially Overpriced**

The project follows the BASCE301 Exploratory Data Analysis course-project requirements and the methodology proposed in the Zeroth Review.

---

## Problem Statement

Laptop prices can vary significantly even among machines with similar specifications. Consumers often lack a clear way to determine:

1. Which hardware specifications have the strongest influence on price.
2. What a laptop's expected/fair price should be.
3. Whether a listed laptop is reasonably priced.
4. Whether a laptop may be underpriced or overpriced relative to its specifications.

The project addresses this problem by combining statistical analysis, machine learning, explainability, and value analysis into a single decision-support system.

---

## Objectives

The project aims to:

1. Analyze relationships between laptop specifications and prices.
2. Perform exploratory data analysis on the laptop dataset.
3. Clean and preprocess the raw data.
4. Engineer meaningful hardware-related features.
5. Compare multiple regression algorithms.
6. Evaluate models using MAE, RMSE, and R².
7. Identify important price-driving specifications.
8. Estimate a fair/expected laptop price.
9. Compare estimated fair price with listed price to assess potential value.

---

## Dataset

### Dataset Source

**Brand Laptops Dataset — Kaggle**

Source:  
https://www.kaggle.com/datasets/bhavikjikadara/brand-laptops-dataset

### Dataset Summary

| Property | Details |
|---|---|
| Dataset | Brand Laptops Dataset |
| Records | 991 laptops |
| Raw attributes | 22 |
| Target variable | `Price` |
| Currency | Indian Rupees (₹) |
| Dataset type | Real-world laptop listings |

The project uses the 991-row dataset as the final project dataset.

---

## Exploratory Data Analysis

The EDA follows the recommended BASCE301 project workflow.

### 1. Data Understanding

The dataset structure, variables, data types, numerical characteristics, and categorical variables were examined before modeling.

### 2. Data Cleaning and Preprocessing

The analysis includes:

- Missing-value detection
- Duplicate detection
- Inconsistent-value checking
- Data-type verification
- Numerical feature preparation
- Categorical feature preparation
- Appropriate encoding and scaling

### 3. Descriptive Statistics

Important numerical variables were examined using:

- Mean
- Median
- Standard deviation
- Minimum
- Maximum
- Quartiles
- Interquartile range

### 4. Univariate Analysis

Individual variables were analyzed using visualizations such as:

- Histograms
- Boxplots
- Bar charts
- Distribution plots

### 5. Bivariate Analysis

Relationships between variables were investigated using:

- Scatter plots
- Grouped comparisons
- Boxplots
- Price-based categorical analysis

### 6. Multivariate and Correlation Analysis

Multiple-variable relationships were examined using:

- Correlation analysis
- Correlation heatmaps
- Pairwise relationships
- Multivariate visualizations

### 7. Outlier Analysis

Potential outliers were identified using statistical and visualization-based approaches. Unusual observations were examined in context rather than automatically removed.

---

## Feature Engineering

The final machine-learning pipeline uses hardware and specification features suitable for laptop price prediction.

### Numerical Features

- `ram_memory`cd "C:\Users\iteja\OneDrive\Desktop\VIT\intelligent-laptop-price-prediction"
- `primary_storage_capacity`
- `num_cores`
- `display_size`
- `resolution_width`
- `resolution_height`
- `is_touch`

### Categorical Features

- `brand`
- `processor_brand`
- `processor_tier`
- `primary_storage_type`
- `gpu_brand`
- `gpu_type`
- `OS`
- `year_of_warranty`

### Preprocessing

Numerical features are standardized using `StandardScaler`.

Categorical features are converted using:

```python
OneHotEncoder(
    handle_unknown="ignore",
    drop="first"
)
```

---

## Web Application

An interactive React front-end for the trained model lives in `web/`. It turns the
analysis into a usable tool: pick a laptop from the dataset or enter specifications
by hand, get the model's estimated fair price in rupees, and see whether a listed
price looks reasonable.

### How It Works

`export_model.py` trains the Linear Regression pipeline described above and exports
its numbers — the intercept, every `StandardScaler` mean and scale, and every
one-hot coefficient — to `web/src/data/modelData.json`.

The browser then reproduces predictions with plain arithmetic:

```
price = intercept + Σ coef × (value − mean) / scale + Σ one-hot coefficients
```

No machine learning library is shipped to the browser and no backend server is
needed, so the application runs as a static site. The export script checks itself:
the exported numbers reproduce scikit-learn's predictions for all 991 rows exactly.

Because the model is linear, the same numbers also explain each prediction. Every
feature's contribution is measured against an average laptop in the dataset, so
`baseline + Σ contributions` adds back up to the predicted price.

### Running the Application

```bash
python export_model.py      # optional: retrain and regenerate modelData.json
cd web
npm install                 # first time only
npm run dev
```

Vite prints a local address, usually http://localhost:5173. `npm run build`
produces a deployable build in `web/dist`.

### Features

| Tab | Description |
|---|---|
| Single Prediction | Pick a laptop from the dataset or enter custom specifications. Shows predicted price against the listed price, the percentage gap, a value verdict (underpriced / fairly priced / overpriced at a ±10% threshold), and the specifications driving that particular price. |
| Feature Impact | Sliders and dropdowns for every model input, with the predicted price updating live. Line charts sweep RAM, storage, CPU cores and display size across their range while all other specifications stay fixed. |
| Compare Laptops | Compare 2–5 laptops side by side. Differing specifications are highlighted, each price gap is broken down by the specification responsible for it, and the best-value laptop is flagged. |
| Best Deals | Scores every listing and ranks the most underpriced and overpriced ones, filterable by brand and maximum price, with a listed-versus-predicted scatter plot. |
| Budget Finder | Set a budget and requirements (brand, minimum RAM and storage, SSD, dedicated GPU, touch screen) to get a top pick, ranked either by best specifications or biggest discount. If nothing fits, it reports what meeting those requirements would cost. |
| Dataset Insights | Visual summary of the data: price distribution, average price by brand and by RAM, and which specifications move the model's predictions the most. |

The interface provides light and dark themes and is usable down to phone widths.

### Model Performance

| Metric | Value |
|---|---|
| Test R² | 0.877 |
| Test MAE | ₹13,862 |
| 5-fold cross-validated R² | 0.795 |
| Rows | 991 (792 train / 199 test) |

The application uses the same 15 features listed under Feature Engineering. Thread
count, secondary storage and product rating were tested as additional inputs and
left out: thread count tracks core count, 98% of listings have no secondary drive,
and rating lowered the test score.

### Project Files

| Path | Contents |
|---|---|
| `laptops_india.csv` | The 991-row dataset |
| `export_model.py` | Training pipeline and model export |
| `web/src/lib/model.js` | Prediction, explanation and value rating in the browser |
| `web/src/components/` | One file per tab |
| `web/src/data/modelData.json` | Generated model coefficients and listings |
