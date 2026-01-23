#!/bin/bash

# ================================================
# Loop Hackathon Frontend - Azure Container Registry Deployment
# Supports Apple Silicon (M1/M2/M3) and Intel Macs
# ================================================

# Configuration - REPLACE THESE VALUES
ACR_NAME="crewimagereg"           # Your Azure Container Registry name (without .azurecr.io)
IMAGE_NAME="asp-test"
TAG="latest"
API_URL="https://loop-hackathon-api-prod-rudra.onrender.com"  # Your backend URL

# Full image name
FULL_IMAGE="${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${TAG}"

# Detect architecture and set platform
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  echo "🍎 Detected Apple Silicon (arm64)"
  PLATFORM="linux/amd64"  # Build for amd64 to deploy on Azure/cloud
  echo "   Building for platform: ${PLATFORM} (for cloud deployment)"
else
  echo "💻 Detected Intel architecture"
  PLATFORM="linux/amd64"
fi

echo ""
echo "🚀 Building Docker image..."
docker build \
  --platform ${PLATFORM} \
  --build-arg NEXT_PUBLIC_API_URL=${API_URL} \
  -t ${IMAGE_NAME}:${TAG} \
  -t ${FULL_IMAGE} \
  .

if [ $? -ne 0 ]; then
  echo "❌ Docker build failed"
  exit 1
fi

echo "✅ Docker image built successfully"

echo ""
echo "🔐 Logging into Azure Container Registry..."
az acr login --name ${ACR_NAME}

if [ $? -ne 0 ]; then
  echo "❌ ACR login failed. Make sure you're logged into Azure CLI (az login)"
  exit 1
fi

echo ""
echo "📤 Pushing image to ACR..."
docker push ${FULL_IMAGE}

if [ $? -ne 0 ]; then
  echo "❌ Docker push failed"
  exit 1
fi

echo ""
echo "✅ Successfully pushed ${FULL_IMAGE}"
echo ""
echo "📋 Next steps:"
echo "   1. Create an Azure Web App for Containers or Azure Container Apps"
echo "   2. Configure it to use image: ${FULL_IMAGE}"
echo "   3. Set environment variable: PORT=3000"
echo ""
