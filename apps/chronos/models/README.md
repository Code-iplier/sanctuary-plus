This folder is intended for the embedded Chronos model artifacts.

Place the trained model files here when you want the same repo to own the ICU runtime end-to-end.

Expected files include:
- feature_columns.json
- model_metadata.json
- grud_model.pt
- tcn_model.pt
- meta_model_names.json
- lgbm_model.pkl
- xgb_model.pkl
- shap_explainer.pkl

If these files are not present yet, the service still starts and returns demo inference data so the app can be bootstrapped.
