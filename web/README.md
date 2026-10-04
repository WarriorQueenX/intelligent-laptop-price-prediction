# Laptop Price Prediction — Web App

React + Vite front-end for the Linear Regression price model. It predicts a fair
price in rupees from a laptop's specs, then compares that with the listed price.

## Running it

```bash
npm install
npm run dev
```

Vite prints a `Local:` URL (usually http://localhost:5173). Other scripts:
`npm run build` for a production build, `npm run lint` for Oxlint.

## How the prediction works

No ML library runs in the browser. `../export_model.py` trains the model and writes
the intercept, the scaler mean/scale for each numeric feature, and every one-hot
coefficient to `src/data/modelData.json`. `src/lib/model.js` reloads those numbers
and scores a laptop with plain arithmetic:

    price = intercept + Σ coef × (value − mean) / scale + Σ one-hot coefficients

Because the model is linear, the same numbers also explain a prediction: each
feature's contribution is measured against an average laptop, and
`baseline + Σ contributions` adds back up to the predicted price.

Re-run `python export_model.py` from the project root whenever the dataset,
cleaning or feature list changes — don't hand-edit `modelData.json`.

## Layout

| Path | What's in it |
| --- | --- |
| `src/lib/model.js` | Scoring, explanation, value rating, rupee formatting |
| `src/lib/theme.js`, `src/lib/ThemeContext.jsx` | Light/dark theme and chart palette |
| `src/components/` | One file per tab, plus the searchable laptop picker |
| `src/data/modelData.json` | Generated — model coefficients, options and the 991 listings |
| `src/App.jsx`, `src/App.css` | Shell, tab bar and the whole design system |
