import paramiko
import sys
import os

def upload_file(host, port, username, password, local_path, remote_path):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        print(f"Connecting to {host}:{port} as {username}...")
        client.connect(host, port=port, username=username, password=password)
        
        sftp = client.open_sftp()
        print(f"Uploading {local_path} to {remote_path}...")
        sftp.put(local_path, remote_path)
        sftp.close()
        
        print("Upload successful!")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    host = "100.100.229.39"
    port = 22
    username = "enbee"
    password = "nplrahman992"
    
    if len(sys.argv) < 3:
        print("Usage: python ssh_upload.py <local_path> <remote_path>")
        sys.exit(1)
        
    local_path = sys.argv[1]
    remote_path = sys.argv[2]
    upload_file(host, port, username, password, local_path, remote_path)
