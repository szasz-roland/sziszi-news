#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "--- Starting Installation on Ubuntu 22.04 ---"

# 1. Update and Upgrade existing system packages
echo "--- Updating system packages ---"
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install prerequisites
echo "--- Installing prerequisites ---"
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# 3. Install Docker
echo "--- Setting up Docker Repository ---"
# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "--- Installing Docker Engine and Docker Compose ---"
sudo apt-get update
# Install Docker Engine, CLI, containerd, and the docker-compose-plugin
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-compose

# 4. Install Node.js (LTS Version)
echo "--- Setting up NodeSource Repository (LTS) ---"
# Download and execute the NodeSource setup script for Node 20 (current LTS as of typical 2024 usage)
# You can change setup_20.x to setup_22.x if you prefer the latest current version
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

echo "--- Installing Node.js and npm ---"
sudo apt-get install -y nodejs

# 5. Build Tools (Optional but recommended for some npm packages)
echo "--- Installing Build Essentials ---"
sudo apt-get install -y build-essential

# 6. Verification
echo "--- Verification ---"
echo "Docker Version:"
sudo docker --version
echo "Docker Compose Version:"
sudo docker compose version
echo "Node Version:"
node -v
echo "NPM Version:"
npm -v

echo "--- Installation Complete! ---"
echo "NOTE: To run Docker without sudo, run: sudo usermod -aG docker \$USER"
echo "Then log out and log back in."
