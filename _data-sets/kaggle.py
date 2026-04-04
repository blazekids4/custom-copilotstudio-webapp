from dotenv import load_dotenv
import kagglehub

load_dotenv()

# Download latest version
path = kagglehub.dataset_download("asifxzaman/social-media-addiction-vs-productivity-dataset")

print("Path to dataset files:", path)