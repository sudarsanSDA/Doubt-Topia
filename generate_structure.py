import os
import json

# The sub-folder containing all your PDF root directories
PDF_BASE_FOLDER = "pdfs"
# Define the root directories to scan *inside* the PDF_BASE_FOLDER
# These are the names of the folders directly under 'pdfs/' (e.g., R20, Syllbus)
ROOT_DIRS_IN_PDFS_FOLDER = ["R20", "Syllbus"]
OUTPUT_FILE = "structure.json" # Output file in the same directory as the script

def get_folder_structure(current_os_dir_path, current_web_base_path):
    """
    Recursively scans a folder and builds a structure for JSON.
    Filters for .pdf files.

    Args:
        current_os_dir_path (str): The current directory's OS path to scan (e.g., ".../doubt-topia-web/pdfs/R20/CSE").
        current_web_base_path (str): The base path for web URLs for items in this directory
                                     (e.g., "pdfs/R20/CSE").
    Returns:
        list: A list of dictionaries, each representing a file or folder.
    """
    items = []
    try:
        for item_name in sorted(os.listdir(current_os_dir_path)):
            item_os_path = os.path.join(current_os_dir_path, item_name)
            # Construct the full web path for this item relative to index.html
            item_web_path = f"{current_web_base_path}/{item_name}".strip("/")

            if os.path.isdir(item_os_path):
                items.append({
                    "name": item_name,  # Display name
                    "type": "folder",
                    "path": item_web_path,  # Unique web path identifier (e.g. "pdfs/R20/CSE")
                    "children": get_folder_structure(item_os_path, item_web_path)
                })
            elif os.path.isfile(item_os_path) and item_name.lower().endswith(".pdf"):
                items.append({
                    "name": item_name, # Display name
                    "type": "file",
                    "path": item_web_path  # Full web path to the file (e.g. "pdfs/R20/CSE/notes.pdf")
                })
    except OSError as e:
        print(f"Error accessing {current_os_dir_path}: {e}")
    return items

if __name__ == "__main__":
    full_structure_for_json = []
    script_dir = os.path.dirname(os.path.abspath(__file__)) # Directory of generate_structure.py
    
    # The OS path to the 'pdfs' folder (e.g., ".../doubt-topia-web/pdfs")
    pdf_container_os_path = os.path.join(script_dir, PDF_BASE_FOLDER)

    if not os.path.exists(pdf_container_os_path) or not os.path.isdir(pdf_container_os_path):
        print(f"Error: The base PDF folder '{PDF_BASE_FOLDER}' was not found at '{pdf_container_os_path}'.")
        print(f"Please ensure it exists and contains your '{', '.join(ROOT_DIRS_IN_PDFS_FOLDER)}' folders.")
        exit()

    # Iterate through the defined root directories within the 'pdfs' folder (R20, Syllbus)
    for content_root_dir_name in ROOT_DIRS_IN_PDFS_FOLDER:
        # OS path to the specific content root (e.g., ".../doubt-topia-web/pdfs/R20")
        content_root_os_path = os.path.join(pdf_container_os_path, content_root_dir_name)
        
        # Web path for this content root, starting with PDF_BASE_FOLDER (e.g., "pdfs/R20")
        content_root_web_path = f"{PDF_BASE_FOLDER}/{content_root_dir_name}".strip("/")

        if os.path.exists(content_root_os_path) and os.path.isdir(content_root_os_path):
            # This entry will be a top-level item in structure.json
            # Its 'name' is "R20", its 'path' is "pdfs/R20"
            full_structure_for_json.append({
                "name": content_root_dir_name, # e.g., "R20" or "Syllbus"
                "type": "folder",
                "path": content_root_web_path, # e.g., "pdfs/R20" or "pdfs/Syllbus"
                "children": get_folder_structure(content_root_os_path, content_root_web_path)
            })
        elif os.path.exists(content_root_os_path) and os.path.isfile(content_root_os_path) and content_root_dir_name.lower().endswith(".pdf"):
            # If a ROOT_DIR_IN_PDFS_FOLDER is actually a file directly under 'pdfs' folder
            full_structure_for_json.append({
                "name": content_root_dir_name,
                "type": "file",
                "path": content_root_web_path
            })
        else:
            print(f"Warning: Content root '{content_root_dir_name}' not found or not a directory/PDF at '{content_root_os_path}'.")

    output_json_path = os.path.join(script_dir, OUTPUT_FILE)
    with open(output_json_path, "w") as f:
        json.dump(full_structure_for_json, f, indent=2)

    print(f"Structure generated and saved to {output_json_path}")
    print(f"Make sure your content folders ({', '.join(ROOT_DIRS_IN_PDFS_FOLDER)}) are inside the '{PDF_BASE_FOLDER}' directory.")
    print(f"The '{PDF_BASE_FOLDER}' directory should be at the same level as your index.html.")