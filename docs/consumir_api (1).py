import os
import sys
import json
import requests
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# Configurar parámetros de conexión a la API
API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
HF_TOKEN = os.getenv("HF_TOKEN")

# Configurar cabeceras estándar para peticiones JSON
headers = {
    "Content-Type": "application/json"
}

# Agregar token de autorización en caso de que esté configurado para un Space privado
if HF_TOKEN:
    headers["Authorization"] = f"Bearer {HF_TOKEN}"


def obtener_cargos():
    """
    Realiza una petición GET para obtener la lista oficial de cargos indexados.
    """
    url = f"{API_BASE_URL}/api/cargos"
    print(f"\n[GET] Consultando lista de cargos a: {url}")
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        
        if response.status_code == 401:
            print("❌ Error: No autorizado. Verifica tu HF_TOKEN.")
            return []
        elif response.status_code == 404:
            print("❌ Error: Servidor no encontrado. Verifica la URL de API_BASE_URL.")
            return []
            
        response.raise_for_status()
        datos = response.json()
        cargos = datos.get("cargos", [])
        print(f"✅ Éxito: Se encontraron {len(cargos)} cargos indexados.")
        return cargos
        
    except requests.exceptions.Timeout:
        print("❌ Error: El tiempo de espera para conectar con la API ha expirado.")
    except requests.exceptions.ConnectionError:
        print("❌ Error: No se pudo establecer conexión con el servidor.")
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
    return []


def generar_evaluacion(cargo, enfoque):
    """
    Realiza una petición POST enviando el cargo y enfoque seleccionados
    para generar el cuestionario de desempeño en escala Likert.
    """
    url = f"{API_BASE_URL}/api/evaluacion/generar"
    print(f"\n[POST] Generando evaluación a: {url}")
    print(f" 👉 Cargo: '{cargo}'\n 👉 Enfoque: '{enfoque}'")
    
    payload = {
        "cargo": cargo,
        "enfoque": enfoque
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        
        if response.status_code == 400:
            print("❌ Error: El cargo especificado no existe en el manual de funciones.")
            return
        elif response.status_code == 401:
            print("❌ Error: Token de autorización inválido.")
            return
            
        response.raise_for_status()
        datos = response.json()
        preguntas = datos.get("preguntas", "")
        
        # Convertir a cadena formateada por si preguntas es un objeto estructurado (dict/list)
        preguntas_str = json.dumps(preguntas, indent=2, ensure_ascii=False) if not isinstance(preguntas, str) else preguntas
        
        print("\n--- 📖 CUESTIONARIO GENERADO POR EL AGENTE ---")
        print(preguntas_str[:800] + "\n... [Contenido truncado para brevedad] ...")
        print("---------------------------------------------")
        
    except requests.exceptions.Timeout:
        print("❌ Error: La operación ha superado el tiempo límite de respuesta (60 segundos).")
    except Exception as e:
        print(f"❌ Error al procesar la generación de la evaluación: {e}")


def procesar_documento_fisico(ruta_archivo):
    """
    [NUEVO] Envía un archivo binario (.pdf o .docx) a través de multipart/form-data
    para extraer y estructurar el texto en un borrador de manual Markdown con LLM.
    """
    url = f"{API_BASE_URL}/api/base_conocimiento/procesar"
    print(f"\n[POST] Enviando archivo físico para procesamiento IA a: {url}")
    print(f" 👉 Archivo: '{ruta_archivo}'")
    
    if not os.path.exists(ruta_archivo):
        print(f"❌ Error: El archivo '{ruta_archivo}' no existe localmente para ser enviado.")
        return None
        
    # Las peticiones multipart/form-data NO deben llevar Content-Type: application/json
    headers_multipart = {}
    if HF_TOKEN:
        headers_multipart["Authorization"] = f"Bearer {HF_TOKEN}"
        
    try:
        # Abrir el archivo binario
        with open(ruta_archivo, "rb") as f:
            files = {"file": (os.path.basename(ruta_archivo), f, "application/octet-stream")}
            response = requests.post(url, headers=headers_multipart, files=files, timeout=45)
            
        response.raise_for_status()
        data = response.json()
        print("✅ Éxito: Documento procesado y estructurado por el LLM.")
        print(f" 👉 Cargo Identificado: '{data.get('cargo_identificado')}'")
        print(f" 👉 Archivo Sugerido: '{data.get('archivo_sugerido')}'")
        return data
        
    except Exception as e:
        print(f"❌ Error al procesar documento binario: {e}")
        return None


def guardar_manual_markdown(nombre_archivo, contenido_markdown):
    """
    [NUEVO] Envía el texto Markdown para ser guardado permanentemente en el disco
    del servidor, gatillando síncronamente la vectorización en ChromaDB.
    """
    url = f"{API_BASE_URL}/api/base_conocimiento/guardar"
    print(f"\n[POST] Guardando e indexando manual de funciones en: {url}")
    print(f" 👉 Archivo a guardar: '{nombre_archivo}'")
    
    payload = {
        "nombre_archivo": nombre_archivo,
        "contenido_markdown": contenido_markdown
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        print("✅ Éxito: Manual guardado e indexado de forma incremental en ChromaDB.")
        print(f" 👉 Mensaje: {data.get('mensaje')}")
        return True
    except Exception as e:
        print(f"❌ Error al guardar e indexar el Markdown: {e}")
        return False


def obtener_contenido_cargo(cargo_name):
    """
    [NUEVO] Recupera el contenido Markdown y nombre de archivo original de un cargo.
    """
    url = f"{API_BASE_URL}/api/base_conocimiento/contenido"
    print(f"\n[GET] Recuperando especificación de cargo a: {url}")
    print(f" 👉 Cargo solicitado: '{cargo_name}'")
    
    try:
        response = requests.get(url, headers=headers, params={"cargo": cargo_name}, timeout=15)
        response.raise_for_status()
        data = response.json()
        print(f"✅ Éxito: Contenido del cargo '{cargo_name}' obtenido.")
        print(f" 👉 Archivo Asociado: '{data.get('nombre_archivo')}'")
        return data
    except Exception as e:
        print(f"❌ Error al consultar contenido de cargo: {e}")
        return None


def eliminar_cargo_de_conocimiento(cargo_name):
    """
    [NUEVO] Solicita la eliminación física del manual del cargo en el servidor
    y la purga incremental de sus registros vectoriales en ChromaDB.
    """
    url = f"{API_BASE_URL}/api/base_conocimiento/eliminar"
    print(f"\n[DELETE] Solicitando remoción segura de cargo a: {url}")
    print(f" 👉 Cargo a eliminar: '{cargo_name}'")
    
    try:
        response = requests.delete(url, headers=headers, params={"cargo": cargo_name}, timeout=30)
        response.raise_for_status()
        data = response.json()
        print("✅ Éxito: Cargo removido físicamente de disco y purgado de ChromaDB.")
        print(f" 👉 Mensaje: {data.get('mensaje')}")
        return True
    except Exception as e:
        print(f"❌ Error al eliminar cargo de la base de conocimientos: {e}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("   🚀 DEMO DE CONSUMO DE LA API REST DE AGENTE RH (CRUD) 🚀")
    print("=" * 60)

    # 1. Obtener la lista inicial de cargos indexados
    cargos = obtener_cargos()
    
    # 2. Ejemplo de Consulta de contenido de un cargo (GET)
    if cargos:
        primer_cargo = cargos[0]
        datos_cargo = obtener_contenido_cargo(primer_cargo)
        
        # 3. Ejemplo de Generación de cuestionario con el agente (POST)
        generar_evaluacion(primer_cargo, "Habilidades de comunicación y trabajo bajo metodologías ágiles")
    
    # 4. Demostración del ciclo CRUD con un Cargo de Prueba temporal
    print("\n--- Demostración de Ciclo de Vida CRUD Temporal ---")
    mock_cargo_name = "Especialista de Pruebas API"
    mock_filename = "especialista_pruebas_api.md"
    mock_markdown = """---
cargo: "Especialista de Pruebas API"
hoja_origen: "TEST CONSUMIDOR"
---
# Manual de Funciones: Especialista de Pruebas API
## 1. OBJETIVO DEL CARGO
Efectuar auditorías automatizadas al comportamiento e integraciones de las APIs REST del sistema.
"""

    # Guardar / Crear
    if guardar_manual_markdown(mock_filename, mock_markdown):
        # Consultar la lista actualizada para verificar adición
        obtener_cargos()
        
        # Consultar contenido individual
        obtener_contenido_cargo(mock_cargo_name)
        
        # Eliminar / Purgar para dejar limpio
        eliminar_cargo_de_conocimiento(mock_cargo_name)
        
        # Consultar lista final para verificar remoción
        obtener_cargos()
