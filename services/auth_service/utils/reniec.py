import requests 
from dotenv import load_dotenv
import os

load_dotenv()

API_KEY = os.getenv("API_KEY")

def validate_dni(dni):
    url = f"https://dniruc.apisperu.com/api/v1/dni/{dni}?token={API_KEY}"
    response = requests.get(url)
    if response.status_code != 200:
        return {"error": "Error al conectar con el servicio de validación de DNI."}
    return response.json()