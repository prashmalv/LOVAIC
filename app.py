import streamlit as st
from io import BytesIO
import numpy as np
from PIL import Image
import os
from tensorflow.keras.models import load_model

# --- Page Config ---
st.set_page_config(
    page_title="LOVAIC — AI Image Classifier",
    page_icon="logo.png",
    layout="wide",
    initial_sidebar_state="expanded",
)

# --- Custom CSS for Modern UI ---
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

/* Hide default Streamlit chrome */
header {visibility: hidden;}
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}

/* Root variables */
:root {
    --primary: #6C63FF;
    --primary-light: #8B83FF;
    --accent: #FF6584;
    --bg-dark: #0E1117;
    --bg-card: #1A1D29;
    --bg-card-hover: #22263A;
    --text-primary: #FAFAFA;
    --text-secondary: #A0A3B1;
    --border: #2D3148;
    --success: #00D68F;
    --gradient: linear-gradient(135deg, #6C63FF 0%, #FF6584 100%);
}

html, body, [class*="css"] {
    font-family: 'Inter', sans-serif;
}

/* Main container */
.main .block-container {
    padding: 2rem 3rem;
    max-width: 1200px;
}

/* Sidebar */
[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #13152B 0%, #1A1D29 100%);
    border-right: 1px solid var(--border);
}

[data-testid="stSidebar"] .stRadio > label {
    color: var(--text-secondary);
    font-weight: 500;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

[data-testid="stSidebar"] .stRadio > div > label {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.75rem 1rem;
    margin-bottom: 0.4rem;
    transition: all 0.2s ease;
    color: var(--text-primary);
}

[data-testid="stSidebar"] .stRadio > div > label:hover {
    background: var(--bg-card-hover);
    border-color: var(--primary);
}

/* Hero section */
.hero-container {
    text-align: center;
    padding: 1.5rem 0 2rem;
}
.hero-title {
    font-size: 2.8rem;
    font-weight: 700;
    background: linear-gradient(135deg, #6C63FF 0%, #FF6584 50%, #FFA06C 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 0.3rem;
    letter-spacing: -0.02em;
}
.hero-subtitle {
    color: #A0A3B1;
    font-size: 1.1rem;
    font-weight: 300;
}

/* Card styles */
.card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    transition: all 0.3s ease;
}
.card:hover {
    border-color: var(--primary);
    box-shadow: 0 0 30px rgba(108, 99, 255, 0.1);
}

/* Prediction result card */
.prediction-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 1.2rem;
    text-align: center;
    transition: all 0.3s ease;
}
.prediction-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.3);
    border-color: var(--primary);
}
.prediction-label {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--primary-light);
    margin: 0.5rem 0 0.2rem;
}
.prediction-confidence {
    font-size: 0.95rem;
    color: var(--text-secondary);
}
.confidence-bar-bg {
    width: 100%;
    height: 6px;
    background: #2D3148;
    border-radius: 3px;
    margin-top: 0.6rem;
    overflow: hidden;
}
.confidence-bar {
    height: 100%;
    border-radius: 3px;
    background: linear-gradient(90deg, #6C63FF, #FF6584);
    transition: width 0.6s ease;
}

/* Upload area */
[data-testid="stFileUploader"] {
    border: 2px dashed var(--border);
    border-radius: 16px;
    padding: 1rem;
    transition: border-color 0.3s ease;
}
[data-testid="stFileUploader"]:hover {
    border-color: var(--primary);
}

/* Buttons */
.stButton > button {
    background: var(--gradient);
    color: white;
    border: none;
    border-radius: 10px;
    padding: 0.6rem 2rem;
    font-weight: 600;
    font-size: 0.95rem;
    letter-spacing: 0.02em;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(108, 99, 255, 0.3);
}
.stButton > button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 25px rgba(108, 99, 255, 0.5);
}

/* Number input */
.stNumberInput > div > div > input {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text-primary);
}

/* Spinner */
.stSpinner > div {
    border-top-color: var(--primary) !important;
}

/* Stats badges */
.stat-badge {
    display: inline-block;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 0.3rem 1rem;
    margin: 0.2rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
}
.stat-badge strong {
    color: var(--primary-light);
}

/* Divider */
.custom-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border), transparent);
    margin: 1.5rem 0;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg-dark); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--primary); }
</style>
""", unsafe_allow_html=True)

# --- Sidebar ---
with st.sidebar:
    st.image("logo.png", width=80)
    st.markdown("""
        <div style="margin-bottom: 1.5rem;">
            <div style="font-size: 1.3rem; font-weight: 700; color: #FAFAFA; margin-bottom: 0.1rem;">LOVAIC</div>
            <div style="font-size: 0.78rem; color: #A0A3B1; font-weight: 400;">RL AI Image Classification Engine</div>
        </div>
    """, unsafe_allow_html=True)

    st.markdown('<div style="font-size:0.75rem;color:#A0A3B1;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:0.5rem;font-weight:600;">Navigation</div>', unsafe_allow_html=True)
    task = st.radio("", ["Classify Images", "Train New Model"], label_visibility="collapsed")

    st.markdown('<div class="custom-divider"></div>', unsafe_allow_html=True)

    st.markdown("""
        <div style="padding: 0.8rem; background: #1A1D29; border: 1px solid #2D3148; border-radius: 12px; margin-top: 1rem;">
            <div style="font-size: 0.75rem; color: #A0A3B1; margin-bottom: 0.4rem; font-weight: 500;">SUPPORTED CLASSES</div>
            <div style="font-size: 0.8rem; color: #FAFAFA; line-height: 1.8;">
                &#9992; Airplane &nbsp;&bull;&nbsp; &#128663; Car &nbsp;&bull;&nbsp; &#128038; Bird<br>
                &#128049; Cat &nbsp;&bull;&nbsp; &#129420; Deer &nbsp;&bull;&nbsp; &#128054; Dog<br>
                &#128056; Frog &nbsp;&bull;&nbsp; &#128014; Horse &nbsp;&bull;&nbsp; &#128674; Ship<br>
                &#128666; Truck
            </div>
        </div>
    """, unsafe_allow_html=True)

    st.markdown("""
        <div style="position: fixed; bottom: 1rem; font-size: 0.7rem; color: #555; padding: 0.5rem;">
            Built with Streamlit &bull; TensorFlow
        </div>
    """, unsafe_allow_html=True)

# --- Model Loader ---
@st.cache_resource
def load_classifier(path):
    return load_model(path)

default_model_path = "RLAI_LOVAIC_best_model.h5"
model_path = st.session_state.get('model_path', default_model_path)
model = load_classifier(model_path)

class_labels = ['Airplane', 'Car', 'Bird', 'Cat', 'Deer', 'Dog', 'Frog', 'Horse', 'Ship', 'Truck']
class_icons = {
    'Airplane': '\u2708\ufe0f', 'Car': '\U0001f697', 'Bird': '\U0001f426',
    'Cat': '\U0001f431', 'Deer': '\U0001f98c', 'Dog': '\U0001f436',
    'Frog': '\U0001f438', 'Horse': '\U0001f40e', 'Ship': '\u26f5',
    'Truck': '\U0001f69a',
}

# ===================== CLASSIFY IMAGES =====================
if task == "Classify Images":
    # Hero
    st.markdown("""
        <div class="hero-container">
            <div class="hero-title">AI Image Classifier</div>
            <div class="hero-subtitle">Upload images and let our deep learning model identify them instantly</div>
        </div>
    """, unsafe_allow_html=True)

    # Upload
    uploaded = st.file_uploader(
        "Drop your images here",
        type=["jpg", "png", "jpeg"],
        accept_multiple_files=True,
        help="Supports JPG, PNG, JPEG. Upload one or more images.",
    )

    if uploaded:
        st.markdown('<div class="custom-divider"></div>', unsafe_allow_html=True)
        st.markdown(f'<div style="font-size:0.85rem;color:#A0A3B1;margin-bottom:1rem;">Analyzing <strong style="color:#6C63FF;">{len(uploaded)}</strong> image{"s" if len(uploaded) > 1 else ""}...</div>', unsafe_allow_html=True)

        cols = st.columns(min(len(uploaded), 4))
        for idx, file in enumerate(uploaded):
            col = cols[idx % min(len(uploaded), 4)]
            img = Image.open(file).convert("RGB")

            img_resized = img.resize((32, 32))
            arr = np.array(img_resized).astype("float32") / 255.0
            arr = np.expand_dims(arr, axis=0)

            pred = model.predict(arr, verbose=0)
            cls = class_labels[np.argmax(pred)]
            conf = np.max(pred) * 100
            icon = class_icons.get(cls, '')

            with col:
                st.image(img, use_container_width=True)
                st.markdown(f"""
                    <div class="prediction-card">
                        <div style="font-size: 2rem;">{icon}</div>
                        <div class="prediction-label">{cls}</div>
                        <div class="prediction-confidence">{conf:.1f}% confidence</div>
                        <div class="confidence-bar-bg">
                            <div class="confidence-bar" style="width: {conf}%;"></div>
                        </div>
                    </div>
                """, unsafe_allow_html=True)

        # Top predictions breakdown
        if len(uploaded) == 1:
            st.markdown('<div class="custom-divider"></div>', unsafe_allow_html=True)
            st.markdown('<div style="font-size:0.85rem;color:#A0A3B1;margin-bottom:0.8rem;font-weight:500;">ALL CLASS PROBABILITIES</div>', unsafe_allow_html=True)

            probs = pred[0]
            sorted_indices = np.argsort(probs)[::-1]
            for i in sorted_indices:
                label = class_labels[i]
                prob = probs[i] * 100
                icon = class_icons.get(label, '')
                bar_color = "#6C63FF" if i == np.argmax(pred) else "#2D3148"
                st.markdown(f"""
                    <div style="display:flex;align-items:center;margin-bottom:0.4rem;">
                        <div style="width:120px;font-size:0.85rem;color:#FAFAFA;">{icon} {label}</div>
                        <div style="flex:1;height:8px;background:#1A1D29;border-radius:4px;margin:0 0.8rem;overflow:hidden;">
                            <div style="width:{prob}%;height:100%;background:{bar_color};border-radius:4px;transition:width 0.5s ease;"></div>
                        </div>
                        <div style="width:50px;text-align:right;font-size:0.8rem;color:#A0A3B1;">{prob:.1f}%</div>
                    </div>
                """, unsafe_allow_html=True)

    else:
        # Empty state
        st.markdown("""
            <div style="text-align:center;padding:4rem 2rem;color:#A0A3B1;">
                <div style="font-size:3rem;margin-bottom:1rem;opacity:0.5;">\U0001f4f7</div>
                <div style="font-size:1.1rem;font-weight:500;color:#FAFAFA;margin-bottom:0.5rem;">No images uploaded yet</div>
                <div style="font-size:0.9rem;">Drag & drop or click above to upload images for classification</div>
            </div>
        """, unsafe_allow_html=True)

# ===================== TRAIN NEW MODEL =====================
elif task == "Train New Model":
    st.markdown("""
        <div class="hero-container">
            <div class="hero-title">Train Custom Model</div>
            <div class="hero-subtitle">Upload your own dataset and train a new classification model</div>
        </div>
    """, unsafe_allow_html=True)

    col1, col2 = st.columns([2, 1])

    with col1:
        dataset = st.file_uploader(
            "Upload dataset (ZIP with subfolders as class names)",
            type=["zip"],
            help="Create a ZIP file where each subfolder name is a class label, containing images of that class.",
        )

    with col2:
        st.markdown('<div style="margin-top:0.5rem;"></div>', unsafe_allow_html=True)
        epochs = st.number_input("Training Epochs", min_value=1, max_value=100, value=5, step=1)
        st.markdown(f"""
            <div class="stat-badge"><strong>{epochs}</strong> epochs</div>
            <div class="stat-badge">Batch size: <strong>32</strong></div>
            <div class="stat-badge">Input: <strong>32x32</strong></div>
        """, unsafe_allow_html=True)

    if dataset:
        if st.button("Start Training", use_container_width=True):
            with st.spinner("Processing dataset and training model..."):
                import zipfile
                import uuid
                import shutil
                import tensorflow as tf
                import matplotlib.pyplot as plt

                temp_dir = f"temp_train_{uuid.uuid4().hex}"
                os.makedirs(temp_dir, exist_ok=True)

                with zipfile.ZipFile(dataset, 'r') as zip_ref:
                    zip_ref.extractall(temp_dir)

                ds = tf.keras.preprocessing.image_dataset_from_directory(
                    temp_dir, image_size=(32, 32), batch_size=32
                )

                class_names = ds.class_names
                num_classes = len(class_names)

                new_model = tf.keras.Sequential([
                    tf.keras.layers.Rescaling(1.0 / 255, input_shape=(32, 32, 3)),
                    tf.keras.layers.Conv2D(32, 3, activation='relu'),
                    tf.keras.layers.MaxPooling2D(),
                    tf.keras.layers.Conv2D(64, 3, activation='relu'),
                    tf.keras.layers.MaxPooling2D(),
                    tf.keras.layers.Flatten(),
                    tf.keras.layers.Dense(128, activation='relu'),
                    tf.keras.layers.Dense(num_classes, activation='softmax'),
                ])

                new_model.compile(
                    optimizer='adam',
                    loss='sparse_categorical_crossentropy',
                    metrics=['accuracy'],
                )

                progress_bar = st.progress(0, text="Training in progress...")
                history = new_model.fit(ds, epochs=epochs, verbose=0)
                progress_bar.progress(100, text="Training complete!")

                # Plot results
                acc = history.history['accuracy']
                loss = history.history['loss']
                epochs_range = range(1, epochs + 1)

                fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
                fig.patch.set_facecolor('#0E1117')

                for ax in (ax1, ax2):
                    ax.set_facecolor('#1A1D29')
                    ax.tick_params(colors='#A0A3B1')
                    ax.spines['bottom'].set_color('#2D3148')
                    ax.spines['left'].set_color('#2D3148')
                    ax.spines['top'].set_visible(False)
                    ax.spines['right'].set_visible(False)

                ax1.plot(epochs_range, acc, color='#6C63FF', linewidth=2, marker='o', markersize=4)
                ax1.set_title('Training Accuracy', color='#FAFAFA', fontsize=12, fontweight='bold')
                ax1.set_xlabel('Epoch', color='#A0A3B1')
                ax1.fill_between(epochs_range, acc, alpha=0.1, color='#6C63FF')

                ax2.plot(epochs_range, loss, color='#FF6584', linewidth=2, marker='o', markersize=4)
                ax2.set_title('Training Loss', color='#FAFAFA', fontsize=12, fontweight='bold')
                ax2.set_xlabel('Epoch', color='#A0A3B1')
                ax2.fill_between(epochs_range, loss, alpha=0.1, color='#FF6584')

                plt.tight_layout()
                st.pyplot(fig)

                # Save
                new_model_path = "saved_models/latest_model.h5"
                os.makedirs("saved_models", exist_ok=True)
                new_model.save(new_model_path)
                st.session_state['model_path'] = new_model_path
                load_classifier.clear()

                st.success(f"Model trained successfully! Saved to `{new_model_path}` and loaded for classification.")
                st.markdown(f"""
                    <div class="card" style="margin-top:1rem;">
                        <div style="font-size:0.85rem;color:#A0A3B1;margin-bottom:0.5rem;">TRAINING SUMMARY</div>
                        <div style="display:flex;gap:1rem;">
                            <div class="stat-badge">Classes: <strong>{num_classes}</strong> ({', '.join(class_names)})</div>
                            <div class="stat-badge">Final Accuracy: <strong>{acc[-1]*100:.1f}%</strong></div>
                            <div class="stat-badge">Final Loss: <strong>{loss[-1]:.4f}</strong></div>
                        </div>
                    </div>
                """, unsafe_allow_html=True)

                shutil.rmtree(temp_dir)
    else:
        st.markdown("""
            <div style="text-align:center;padding:4rem 2rem;color:#A0A3B1;">
                <div style="font-size:3rem;margin-bottom:1rem;opacity:0.5;">\U0001f9e0</div>
                <div style="font-size:1.1rem;font-weight:500;color:#FAFAFA;margin-bottom:0.5rem;">Ready to train</div>
                <div style="font-size:0.9rem;">Upload a ZIP file with labeled image folders to begin training</div>
            </div>
        """, unsafe_allow_html=True)
