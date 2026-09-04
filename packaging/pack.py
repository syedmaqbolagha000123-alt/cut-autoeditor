import os
import zipfile
import sys

def zip_folder(folder_path, output_zip):
    exclude_dirs = {'node_modules', '.git', 'lost+found', 'temp', 'cache', 'exports'}
    
    if os.path.exists(output_zip):
        os.remove(output_zip)

    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(folder_path):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for file in files:
                if file.endswith('.zip') and root == folder_path:
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, folder_path)
                zf.write(full_path, rel_path)

    size_mb = os.path.getsize(output_zip) / (1024 * 1024)
    print(f"Created: {output_zip} ({size_mb:.2f} MB)")

if __name__ == '__main__':
    src = sys.argv[1]
    dst = sys.argv[2]
    zip_folder(src, dst)
