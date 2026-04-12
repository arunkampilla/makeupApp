# Build frontend
cd frontend && npm install && npm run build
# Move build files to backend static folder
cp -r dist/* ../backend/
# Install backend dependencies
cd ../backend && pip install -r requirements.txt
