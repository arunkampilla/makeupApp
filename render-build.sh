# Build frontend
cd app/frontend && npm install && npm run build
# Move build files to backend static folder
cp -r dist/* ..app/backend/
# Install backend dependencies
cd app/backend && pip install -r requirements.txt
# Start command
uvicorn server:app --host 0.0.0.0 --port $PORT
#uvicorn app.backend.server:app --host 0.0.0.0 --port 10000
#cd app/backend && uvicorn server:app --host 0.0.0.0 --port $PORT
