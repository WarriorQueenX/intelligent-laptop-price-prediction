# Intelligent Laptop Price Prediction and Value Analysis Using Machine Learning

> An explainable machine learning approach for predicting laptop prices, identifying important price-driving specifications, and assessing whether a laptop listing is potentially underpriced, fairly priced, or overpriced.

---

##  Project Overview

Laptop prices vary significantly depending on specifications such as processor, RAM, storage, GPU, display, brand, and device condition. Because of this, it can be difficult for buyers to determine whether the listed price of a laptop represents reasonable value.

This project develops a data-driven laptop price analysis system that goes beyond simply predicting a price.

The project combines:

- Exploratory Data Analysis (EDA)
- Data cleaning and preprocessing
- Hardware-oriented feature engineering
- Multiple regression models
- Model evaluation using MAE, RMSE, and R²
- Feature importance and model explainability
- Fair-price estimation
- Value assessment of laptop listings

The final system is intended as a **decision-support approach**, helping users understand both the expected price of a laptop and whether its listed price appears reasonable relative to its specifications.

---

##  Objectives

The main objectives of the project are:

1. Analyze relationships between laptop specifications and prices.
2. Perform exploratory data analysis on laptop pricing data.
3. Clean and preprocess the dataset for machine learning.
4. Engineer meaningful hardware-related features.
5. Train and compare multiple regression algorithms.
6. Evaluate model performance using MAE, RMSE, and R².
7. Identify specifications that strongly influence laptop prices.
8. Estimate a fair or expected price for each laptop.
9. Compare the estimated fair price with the listed price.
10. Classify listings as potentially underpriced, fairly priced, or potentially overpriced.

---

##  Project Workflow

```text
Laptop Specifications
        ↓
Data Cleaning & Preprocessing
        ↓
Exploratory Data Analysis
        ↓
Feature Engineering
        ↓
Encoding & Scaling
        ↓
Train-Test Split + Cross Validation
        ↓
Regression Model Training
        ↓
Model Evaluation
        ↓
Feature Importance / Explainability
        ↓
Fair Price Estimation
        ↓
Value Assessment

Dataset

The project uses the Laptops Price Dataset available on Kaggle.

Dataset source:

https://www.kaggle.com/datasets/juanmerinobermejo/laptops-price-dataset

Dataset Dimensions
Property	Value
Rows	2,160
Columns	12
Target Variable	Final Price
Original Attributes

The dataset contains the following attributes:

Laptop
Status
Brand
Model
CPU
RAM
Storage
Storage type
GPU
Screen
Touch
Final Price

The target variable for price prediction is:

Final Price

Data Cleaning

Several data-quality issues were identified and handled before analysis and modeling.

Issue	Treatment
Missing GPU values	Interpreted as integrated graphics and replaced with Integrated
Missing Storage Type	Imputed using the mode (SSD)
Missing Screen values	Imputed using the median
Duplicate rows	No duplicates were found
Column naming inconsistencies	Standardized to lowercase snake_case
Category whitespace	Removed using text trimming

No rows were removed during the cleaning process.

The cleaned dataset is saved as:

data/laptops_cleaned.csv
Exploratory Data Analysis

The EDA investigated the distribution of laptop prices and the relationship between hardware specifications and price.

Price Distribution

The Final Price variable is right-skewed with a skewness of approximately 1.65.

Statistic	Value
Minimum Price	$201.05
Maximum Price	$7,150.47
Median Price	≈ $1,032
Mean Price	≈ $1,313

The distribution contains a long premium-price tail containing high-end gaming and workstation laptops.

Important EDA Findings
RAM has a strong positive relationship with price (r ≈ 0.72).
Storage has a strong positive relationship with price (r ≈ 0.70).
Screen size has a comparatively weak relationship with price (r ≈ 0.27).
Laptops with discrete GPUs have substantially higher median prices than laptops using integrated graphics.
Brand has a significant influence on pricing.
Higher RAM configurations generally correspond to higher prices, although the price level differs considerably between brands.
High-end outliers were generally legitimate premium laptops rather than obvious data errors.

These findings guided the feature-engineering and machine-learning stages.

Feature Engineering

Additional features were derived from the original laptop specifications.

Engineered Features
ram_gb
storage_gb
screen_size
is_ssd
is_touch
is_new
has_discrete_gpu
CPU brand
CPU performance tier
GPU brand

CPU and GPU information was transformed into broader categories to make the specifications more useful for machine learning.

Categorical features were encoded using one-hot encoding, while numerical features were standardized before model training.

Machine Learning Models

Three regression algorithms were trained and compared:

1. Linear Regression

A baseline regression model used to estimate the relationship between laptop specifications and price.

2. Random Forest Regressor

An ensemble tree-based regression model capable of capturing nonlinear relationships between laptop specifications and price.

3. XGBoost Regressor

A gradient-boosting model used to capture complex relationships and interactions within the dataset.

Model Evaluation

The models were evaluated using:

Mean Absolute Error (MAE)

Measures the average absolute difference between the actual and predicted prices.

Lower is better.

Root Mean Squared Error (RMSE)

Measures prediction error while giving greater weight to larger errors.

Lower is better.

R² Score

Measures the proportion of price variation explained by the model.

Higher is better.

Test Set Results
Model	MAE	RMSE	R²
Linear Regression	260.82	390.13	0.835
Random Forest	263.28	447.64	0.783
XGBoost	259.84	419.30	0.809
Best Overall Model

Based on the test-set results, Linear Regression achieved the strongest overall performance:

Lowest RMSE
Highest R²
Competitive MAE

XGBoost achieved the lowest MAE, while Linear Regression provided the best overall balance across the evaluation metrics.

Cross-Validation

Five-fold cross-validation was also performed to evaluate model stability across different data splits.

Model	CV MAE	CV RMSE	CV R²
Linear Regression	288.69	413.66	0.780
Random Forest	282.18	425.10	0.769
XGBoost	282.67	416.41	0.777

The cross-validation results support the conclusion that Linear Regression remains the strongest overall model, while XGBoost performs closely.

Feature Importance & Explainability

Model explainability was included to understand which laptop specifications contribute most strongly to predicted prices.

Permutation importance for the Linear Regression model indicated that the most influential feature groups included:

GPU
CPU
RAM
Brand
Storage

SHAP analysis was also applied to the XGBoost model to provide a more detailed view of how individual encoded features influence predictions.

This makes the project more interpretable than a system that simply produces a price prediction without explaining the underlying factors.

Fair Price Estimation

The project extends price prediction into value analysis.

Instead of using the model's predictions on the same data used to train it, five-fold out-of-fold predictions are used to estimate a more realistic expected price for each laptop.

For every laptop:

Price Difference = Listed Price - Fair Price

and

Price Difference (%) =
(Listed Price - Fair Price) / Fair Price × 100

The project uses a ±10% threshold to classify listings.

Value Classification
Price Difference	Classification
Less than -10%	Potentially Underpriced
-10% to +10%	Fairly Priced
Greater than +10%	Potentially Overpriced
Value Analysis Results
Category	Count	Percentage
Potentially Underpriced	902	41.76%
Fairly Priced	587	27.18%
Potentially Overpriced	671	31.06%

These classifications are model-based indications, not definitive judgments of actual market value.

Key Findings

The analysis produced several important observations:

RAM and Storage

RAM and storage show the strongest numeric relationships with laptop price, indicating that higher-capacity configurations generally command higher prices.

GPU

GPU configuration is one of the strongest pricing signals. Discrete-GPU laptops have a substantially higher median price than integrated-GPU laptops.

Brand

Brand contributes a significant pricing signal. Different brands can occupy very different price ranges even for similar hardware configurations.

Premium Laptops

The dataset contains a legitimate premium segment consisting of high-RAM, high-performance GPU, gaming, and workstation laptops.

Price Distribution

Laptop prices are strongly right-skewed, meaning that a relatively small number of expensive laptops substantially increase the mean price.

Technologies Used
Technology	Purpose
Python	Programming language
Pandas	Data manipulation
NumPy	Numerical computation
Matplotlib	Visualization
Seaborn	Exploratory visualization
Scikit-learn	Preprocessing, regression, evaluation
XGBoost	Gradient boosting regression
SHAP	Model explainability
Google Colab	Development and experimentation
Jupyter Notebook	Interactive analysis
Kaggle	Dataset source

Repository Structure
intelligent-laptop-price-prediction/
│
├── Eda_Project_Batch_14.ipynb
│
├── data/
│   └── laptops_cleaned.csv
│
└── README.md
Files

Eda_Project_Batch_14.ipynb

Contains the complete project workflow, including:

Data loading
Data cleaning
Exploratory Data Analysis
Feature engineering
Preprocessing
Model training
Model evaluation
Cross-validation
Feature importance
SHAP explainability
Fair-price estimation
Value classification

data/laptops_cleaned.csv

The cleaned, analysis-ready dataset generated during preprocessing.

How to Run
Option 1 — Google Colab
Open Eda_Project_Batch_14.ipynb.
Open the notebook in Google Colab.
Ensure the repository structure is preserved.
Run the notebook cells from top to bottom.
Option 2 — Local Jupyter Environment

Clone the repository:

git clone <repository-url>

Navigate into the project:

cd intelligent-laptop-price-prediction

Install the required Python libraries:

pip install pandas numpy matplotlib seaborn scikit-learn xgboost shap jupyter

Launch Jupyter:

jupyter notebook

Open:

Eda_Project_Batch_14.ipynb

and execute the cells sequentially.

Limitations

This project provides model-based price estimates and value indications, not guaranteed market prices.

The following limitations should be considered:

The model is trained on the available Kaggle dataset and may not represent the entire laptop market.
Laptop prices can change over time because of market conditions, discounts, product availability, and newer hardware releases.
Brand and hardware specifications do not capture every factor affecting laptop prices.
The fair-price classification uses a project-defined ±10% threshold.
High-end laptops are more difficult to predict accurately because they represent a smaller portion of the dataset.
The value categories should be interpreted as potential indications rather than definitive claims that a laptop is actually overpriced or underpriced.

Future Scope

Possible extensions include:

Testing target-variable transformations such as log-price modeling.
Hyperparameter tuning for tree-based models.
Additional feature engineering for CPU and GPU performance.
Incorporating current market-price data.
Building an interactive web-based price prediction interface.
Allowing users to enter laptop specifications and receive:
Estimated price
Fair-price range
Value classification
Explanation of major price-driving features
Team

Course: BASCE301 — Exploratory Data Analysis

Project: Intelligent Laptop Price Prediction and Value Analysis Using Machine Learning

Team Members:

Aarav Sijariya — 25BDS0058
Sulagna Chowdhury — 25BCE0979
Tejaswini Jaiswal — 25BDS0054

Guide: Padma Priya M

References
J. Merino Bermejo, Laptops Price Dataset, Kaggle.
https://www.kaggle.com/datasets/juanmerinobermejo/laptops-price-dataset
K. C. Hansel, V. A. Tanoto, P. A. Suri, and M. Fajar, "Comparative Analysis of Machine Learning Algorithms for Laptop Value Estimation," Procedia Computer Science, vol. 245, pp. 825–833, 2024.
Y. Karakuş and T. T. Bilgin, "Laptop Price Range Prediction with Machine Learning Methods," International Journal of Multidisciplinary Studies and Innovative Technologies, vol. 8, no. 1, pp. 40–45, 2024.
P. Tian, "Research on Laptop Price Predictive Model Based on Linear Regression, Random Forest and XGBoost," Highlights in Science, Engineering and Technology, vol. 85, pp. 265–271, 2024.
