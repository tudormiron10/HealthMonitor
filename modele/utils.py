"""
=============================================================================
UTILS — Functii reutilizabile pentru toate pipeline-urile ML
=============================================================================
Acest modul contine functiile comune folosite de toate modelele:
- Imputare MICE (IterativeImputer + BayesianRidge)
- Scalare StandardScaler
- SMOTE pentru echilibrarea claselor
- Definirea modelelor (LogReg, RF, XGBoost)
- Evaluare + confusion matrix + feature importance
- Cross-validation stratificata
- Pipeline complet parametrizat
=============================================================================
"""

import os
import numpy as np
import pandas as pd
import joblib
import warnings
from datetime import datetime

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression, BayesianRidge
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report, confusion_matrix, f1_score,
    roc_auc_score, make_scorer
)
from sklearn.experimental import enable_iterative_imputer  # noqa: F401
from sklearn.impute import IterativeImputer

from imblearn.over_sampling import SMOTE
from xgboost import XGBClassifier

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

warnings.filterwarnings('ignore')


# Project root = parent of modele/
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATE_PROCESATE = os.path.join(PROJECT_ROOT, 'date', 'procesate')

RANDOM_STATE = 42
TEST_SIZE = 0.20
CV_FOLDS = 5


def get_dataset_path(filename):
    """Return absolute path to a file in date/procesate/."""
    return os.path.join(DATE_PROCESATE, filename)


def incarca_date(fisier, target_col, clase_map):
    """
    Load dataset and extract target variable.

    Args:
        fisier: path to CSV file
        target_col: name of the target column
        clase_map: dict mapping class codes to labels, e.g. {0: 'Sanatos', 1: 'Diabet'}

    Returns:
        df: full DataFrame
        y: target Series (int)
    """
    df = pd.read_csv(fisier)
    y = df[target_col].astype(int)

    print(f"Date incarcate: {df.shape[0]:,} pacienti x {df.shape[1]} coloane")
    print(f"\nDistributia {target_col}:")
    for val, cnt in y.value_counts().sort_index().items():
        label = clase_map.get(val, str(val))
        print(f"   {val} ({label:18s}): {cnt:6d} ({cnt/len(y)*100:.1f}%)")

    return df, y
 

def creeaza_imputer_scaler():
    """
    Create IterativeImputer (MICE) + StandardScaler.

    BayesianRidge is used as estimator because:
    - Robust to multicollinearity (cholesterol fractions correlate)
    - Automatic regularization via bayesian prior
    - Probabilistic estimates with sample_posterior=True
    """
    imputer = IterativeImputer(
        estimator=BayesianRidge(),
        max_iter=10,
        random_state=RANDOM_STATE,
        sample_posterior=True,
        tol=1e-3,
        verbose=0
    )
    scaler = StandardScaler()
    return imputer, scaler

def aplica_smote(X_train, y_train, clase_map, sampling_strategy=None):
    """
    Apply SMOTE to balance classes on training set only.

    Args:
        X_train: numpy array of features
        y_train: numpy array of target
        clase_map: dict for display labels
        sampling_strategy: dict {class: target_count} or None for auto
    """
    print(f"\nDistributie INAINTE de SMOTE:")
    for val, cnt in pd.Series(y_train).value_counts().sort_index().items():
        label = clase_map.get(val, str(val))
        print(f"   {val} ({label:18s}): {cnt:6d}")

    if sampling_strategy is None:
        # Auto strategy: minority classes to 50% of majority
        contor = pd.Series(y_train).value_counts()
        majority_count = contor.max()
        sampling_strategy = {}
        for cls, cnt in contor.items():
            if cnt < majority_count:
                target = max(cnt, int(majority_count * 0.5))
                sampling_strategy[cls] = target

    if not sampling_strategy:
        print("   Clasele sunt deja echilibrate, SMOTE nu e necesar.")
        return X_train, y_train

    smote = SMOTE(
        sampling_strategy=sampling_strategy,
        random_state=RANDOM_STATE,
        k_neighbors=5
    )
    X_res, y_res = smote.fit_resample(X_train, y_train)

    print(f"\nDistributie DUPA SMOTE:")
    for val, cnt in pd.Series(y_res).value_counts().sort_index().items():
        label = clase_map.get(val, str(val))
        print(f"   {val} ({label:18s}): {cnt:6d}")

    return X_res, y_res



def defineste_modele(is_binary=False):
    """
    Define the 3 standard models: LogReg, RandomForest, XGBoost.

    Args:
        is_binary: if True, use binary-specific settings for XGBoost
    """
    xgb_objective = 'binary:logistic' if is_binary else 'multi:softproba'
    xgb_metric = 'logloss' if is_binary else 'mlogloss'

    modele = {
        'LogisticRegression': LogisticRegression(
            max_iter=2000,
            solver='saga',
            class_weight='balanced',
            random_state=RANDOM_STATE,
            n_jobs=-1
        ),
        'RandomForest': RandomForestClassifier(
            n_estimators=300,
            max_depth=15,
            min_samples_split=10,
            min_samples_leaf=5,
            class_weight='balanced_subsample',
            random_state=RANDOM_STATE,
            n_jobs=-1
        ),
        'XGBoost': XGBClassifier(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            objective=xgb_objective,
            eval_metric=xgb_metric,
            use_label_encoder=False,
            random_state=RANDOM_STATE,
            n_jobs=-1
        ),
    }
    return modele



def evalueaza_model(model, X_test, y_test, nume_model, varianta,
                    feature_names, clase_map, output_dir, cmap='Blues'):
    """
    Evaluate a trained model. Generate metrics, confusion matrix, importance.

    Returns:
        dict with all evaluation results
    """
    y_pred = model.predict(X_test)
    is_binary = len(clase_map) == 2

    # AUC for binary classification
    auc = None
    if is_binary and hasattr(model, 'predict_proba'):
        y_proba = model.predict_proba(X_test)[:, 1]
        auc = roc_auc_score(y_test, y_proba)

    f1_macro = f1_score(y_test, y_pred, average='macro')
    f1_weighted = f1_score(y_test, y_pred, average='weighted')

    print(f"\n{'─' * 60}")
    print(f"{varianta} — {nume_model}")
    print(f"{'─' * 60}")
    print(f"   F1-macro:    {f1_macro:.4f}")
    print(f"   F1-weighted: {f1_weighted:.4f}")
    if auc:
        print(f"   AUC-ROC:     {auc:.4f}")
    print(f"\n{classification_report(y_test, y_pred, target_names=list(clase_map.values()))}")

    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    fig, ax = plt.subplots(figsize=(7, 5))
    sns.heatmap(cm, annot=True, fmt='d', cmap=cmap,
                xticklabels=list(clase_map.values()),
                yticklabels=list(clase_map.values()), ax=ax,
                annot_kws={'size': 14})
    ax.set_xlabel('Predictie', fontsize=12)
    ax.set_ylabel('Real', fontsize=12)
    title = f'Matrice de Confuzie — {varianta} {nume_model}\nF1-macro={f1_macro:.4f}'
    if auc:
        title += f' | AUC={auc:.4f}'
    ax.set_title(title, fontsize=13)
    plt.tight_layout()
    fname = os.path.join(output_dir, f'confuzie_{varianta}_{nume_model}.png')
    fig.savefig(fname, dpi=150, bbox_inches='tight')
    plt.close(fig)
    print(f"   Salvat: {fname}")

    # Feature importance
    if hasattr(model, 'feature_importances_'):
        importances = model.feature_importances_
        indices = np.argsort(importances)[::-1][:15]
        fig2, ax2 = plt.subplots(figsize=(10, 6))
        top_f = [feature_names[i] for i in indices]
        top_v = importances[indices]
        colors = sns.color_palette('viridis', len(indices))
        ax2.barh(range(len(indices)), top_v[::-1], color=colors)
        ax2.set_yticks(range(len(indices)))
        ax2.set_yticklabels(top_f[::-1], fontsize=10)
        ax2.set_xlabel('Importanta', fontsize=12)
        ax2.set_title(f'Top 15 Feature Importance — {varianta} {nume_model}', fontsize=14)
        plt.tight_layout()
        fname2 = os.path.join(output_dir, f'importance_{varianta}_{nume_model}.png')
        fig2.savefig(fname2, dpi=150, bbox_inches='tight')
        plt.close(fig2)
        print(f"   Salvat: {fname2}")

    return {
        'model': nume_model,
        'varianta': varianta,
        'f1_macro': f1_macro,
        'f1_weighted': f1_weighted,
        'auc_roc': auc,
        'confusion_matrix': cm,
    }


def cross_validate_model(model, X, y, cv_folds, nume_model, varianta, is_binary=False):
    """Stratified k-fold CV with F1-macro (+ AUC for binary)."""
    cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=RANDOM_STATE)

    scoring = {'f1_macro': make_scorer(f1_score, average='macro')}
    if is_binary:
        scoring['roc_auc'] = 'roc_auc'

    print(f"\n   Cross-validation ({cv_folds}-fold) pentru {varianta} — {nume_model}...")

    cv_results = cross_validate(
        model, X, y, cv=cv, scoring=scoring,
        return_train_score=True, n_jobs=-1
    )

    print(f"   F1-macro (CV): {cv_results['test_f1_macro'].mean():.4f} "
          f"+/- {cv_results['test_f1_macro'].std():.4f}")
    if is_binary:
        print(f"   AUC-ROC  (CV): {cv_results['test_roc_auc'].mean():.4f} "
              f"+/- {cv_results['test_roc_auc'].std():.4f}")

    return cv_results



def ruleaza_pipeline(varianta, predictori, df, y, clase_map, output_dir,
                     target_name='Target', smote_strategy=None, cmap='Blues'):
    """
    Run the complete ML pipeline for one model variant.

    Args:
        varianta: 'ModelA' or 'ModelB'
        predictori: list of feature column names
        df: full DataFrame
        y: target Series
        clase_map: dict {code: label}
        output_dir: directory for results
        target_name: name of the prediction target
        smote_strategy: dict for SMOTE or None for auto
        cmap: colormap for confusion matrix
    """
    is_binary = len(clase_map) == 2
    os.makedirs(output_dir, exist_ok=True)

    print(f"\n{'=' * 65}")
    print(f"PIPELINE: {varianta} ({len(predictori)} predictori)")
    print(f"{'=' * 65}")

    X = df[predictori].copy()

    # Step 1: Split
    print(f"\nPas 1: Train/Test Split ({int((1-TEST_SIZE)*100)}/{int(TEST_SIZE*100)})")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, stratify=y, random_state=RANDOM_STATE
    )
    print(f"   Train: {X_train.shape[0]:,} | Test: {X_test.shape[0]:,}")

    # Step 2: Imputation
    print(f"\nPas 2: Imputare MICE")
    nan_before = X_train.isnull().sum().sum() + X_test.isnull().sum().sum()
    imputer, scaler = creeaza_imputer_scaler()
    X_train_imp = pd.DataFrame(imputer.fit_transform(X_train), columns=predictori, index=X_train.index)
    X_test_imp = pd.DataFrame(imputer.transform(X_test), columns=predictori, index=X_test.index)
    nan_after = X_train_imp.isnull().sum().sum() + X_test_imp.isnull().sum().sum()
    print(f"   NaN: {nan_before:,} -> {nan_after}")
    assert nan_after == 0, "NaN remaining after imputation!"

    # Step 3: Scaling
    print(f"\nPas 3: Scalare StandardScaler")
    X_train_sc = pd.DataFrame(scaler.fit_transform(X_train_imp), columns=predictori, index=X_train_imp.index)
    X_test_sc = pd.DataFrame(scaler.transform(X_test_imp), columns=predictori, index=X_test_imp.index)

    # Step 4: SMOTE
    print(f"\nPas 4: SMOTE")
    X_train_bal, y_train_bal = aplica_smote(X_train_sc.values, y_train.values, clase_map, smote_strategy)

    # Step 5: Train & Evaluate
    print(f"\nPas 5: Antrenare modele")
    modele = defineste_modele(is_binary=is_binary)
    rezultate = []
    modele_antrenate = {}

    for name, model in modele.items():
        print(f"\n   Antrenare: {name}")
        model.fit(X_train_bal, y_train_bal)
        modele_antrenate[name] = model

        rez = evalueaza_model(model, X_test_sc.values, y_test.values,
                              name, varianta, predictori, clase_map, output_dir, cmap)
        rezultate.append(rez)

        cv_rez = cross_validate_model(model, X_train_sc.values, y_train.values,
                                      CV_FOLDS, name, varianta, is_binary)
        rez['cv_f1_macro_mean'] = cv_rez['test_f1_macro'].mean()
        rez['cv_f1_macro_std'] = cv_rez['test_f1_macro'].std()
        if is_binary and 'test_roc_auc' in cv_rez:
            rez['cv_auc_mean'] = cv_rez['test_roc_auc'].mean()
            rez['cv_auc_std'] = cv_rez['test_roc_auc'].std()

    # Save models
    for name, model in modele_antrenate.items():
        fpath = os.path.join(output_dir, f'{varianta}_{name}.pkl')
        joblib.dump({
            'model': model, 'imputer': imputer, 'scaler': scaler,
            'predictori': predictori, 'varianta': varianta,
            'clase': clase_map, 'target': target_name,
            'timestamp': datetime.now().isoformat()
        }, fpath)
        print(f"   Model salvat: {fpath}")

    return rezultate


def afiseaza_tabel_comparativ(toate_rezultatele, output_dir, output_filename='comparatie_modele.csv'):
    """Print and save comparison table for all model results."""
    print(f"\n\n{'=' * 65}")
    print(f"TABEL COMPARATIV FINAL")
    print(f"{'=' * 65}")

    has_auc = any(r.get('auc_roc') is not None for r in toate_rezultatele)

    header = f"{'Varianta':<10} {'Model':<22} {'F1-macro':<10}"
    if has_auc:
        header += f" {'AUC-ROC':<10}"
    header += f" {'CV F1-macro':<15}"
    print(header)
    print('─' * len(header))

    for r in toate_rezultatele:
        cv_f1 = f"{r.get('cv_f1_macro_mean', 0):.4f}+/-{r.get('cv_f1_macro_std', 0):.4f}"
        line = f"{r['varianta']:<10} {r['model']:<22} {r['f1_macro']:<10.4f}"
        if has_auc:
            auc_str = f"{r['auc_roc']:.4f}" if r.get('auc_roc') else 'N/A'
            line += f" {auc_str:<10}"
        line += f" {cv_f1:<15}"
        print(line)

    # Save CSV
    df_rez = pd.DataFrame([
        {k: v for k, v in r.items() if k != 'confusion_matrix'}
        for r in toate_rezultatele
    ])
    fpath = os.path.join(output_dir, output_filename)
    df_rez.to_csv(fpath, index=False)
    print(f"\nTabel salvat: {fpath}")

    return df_rez
