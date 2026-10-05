# Intelligent Laptop Price Prediction and Value Analysis Using Machine Learning

> **Beyond price prediction — explainable, fair-value decision support for laptop buyers**

## 📌 Project Overview

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

## 🎯 Problem Statement

Laptop prices can vary significantly even among machines with similar specifications. Consumers often lack a clear way to determine:

1. Which hardware specifications have the strongest influence on price.
2. What a laptop's expected/fair price should be.
3. Whether a listed laptop is reasonably priced.
4. Whether a laptop may be underpriced or overpriced relative to its specifications.

The project addresses this problem by combining statistical analysis, machine learning, explainability, and value analysis into a single decision-support system.

---

## 🎯 Objectives

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

## 📊 Dataset

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

## 🔍 Exploratory Data Analysis

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

## 🛠️ Feature Engineering

The final machine-learning pipeline uses hardware and specification features suitable for laptop price prediction.

### Numerical Features

- `ram_memory`
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
