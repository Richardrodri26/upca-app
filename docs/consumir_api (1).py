import os
import sys
import json
import requests
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# Configurar parametros de conexion a la API
API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
HF_TOKEN = os.getenv("HF_TOKEN")

# Configurar cabeceras estandar para peticiones JSON
headers = {
    "Content-Type": "application/json"
}

# Agregar token de autorizacion en caso de que este configurado para un Space privado
if HF_TOKEN:
    headers["Authorization"] = f"Bearer {HF_TOKEN}"


def obtener_cargos():
    """
    Realiza una peticion GET para obtener la lista oficial de cargos indexados.
    """
    url = f"{API_BASE_URL}/api/cargos"
    print(f"Enviando peticion GET a: {url}")
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        
        # Interceptar errores comunes de autenticacion o de ruta
        if response.status_code == 401:
            print("Error: No autorizado. Verifica tu HF_TOKEN.")
            return []
        elif response.status_code == 404:
            print("Error: Servidor no encontrado. Verifica la URL de API_BASE_URL.")
            return []
            
        response.raise_for_status()
        
        datos = response.json()
        cargos = datos.get("cargos", [])
        print(f"Exito: Se encontraron {len(cargos)} cargos indexados.")
        return cargos
        
    except requests.exceptions.Timeout:
        print("Error: El tiempo de espera para conectar con la API ha expirado.")
    except requests.exceptions.ConnectionError:
        print("Error: No se pudo establecer conexion con el servidor.")
    except Exception as e:
        print(f"Error inesperado: {e}")
    return []


def generar_evaluacion(cargo, enfoque):
    """
    Realiza una peticion POST enviando el cargo y enfoque seleccionados
    para generar el cuestionario de desempeño en escala Likert.
    """
    url = f"{API_BASE_URL}/api/evaluacion/generar"
    print(f"\nEnviando peticion POST a: {url}")
    print(f"Cargo: {cargo} | Enfoque: {enfoque}")
    
    payload = {
        "cargo": cargo,
        "enfoque": enfoque
    }
    
    try:
        # Se envia la solicitud POST con el cuerpo formateado en JSON
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        
        if response.status_code == 400:
            print("Error: El cargo especificado no existe en el manual de funciones.")
            return
        elif response.status_code == 401:
            print("Error: Token de autorizacion invalido.")
            return
            
        response.raise_for_status()
        
        datos = response.json()
        preguntas = datos.get("preguntas", "")
        
        print("\n--- CUESTIONARIO GENERADO POR EL AGENTE ---")
        print(preguntas)
        print("-------------------------------------------")
        
    except requests.exceptions.Timeout:
        print("Error: La operacion ha superado el tiempo limite de respuesta (60 segundos).")
    except Exception as e:
        print(f"Error al procesar la generacion de la evaluacion: {e}")


if __name__ == "__main__":
    # 1. Obtener la lista de cargos indexados en el sistema
    cargos = obtener_cargos()
    
    if cargos:
        # 2. Utilizar el primer cargo devuelto para realizar la prueba de generacion
        cargo_ejemplo = cargos[0]
        enfoque_ejemplo = "Trabajo en equipo, comunicacion asertiva y liderazgo operativo"
        
        generar_evaluacion(cargo_ejemplo, enfoque_ejemplo)
    else:
        print("No se pudo proceder con la prueba al no detectar cargos disponibles.")
