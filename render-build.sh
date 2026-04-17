# Build frontend
cd src/ && npm install && npm run build
# Move build files to backend static folder
cp -r dist/* ..src/backend/
# Install backend dependencies
cd src/backend && pip install -r requirements.txt
# Start commadn
cd src/backend && uvicorn server:app --host 0.0.0.0 --port $PORT
