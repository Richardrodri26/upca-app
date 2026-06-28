# Guia de Referencia de Integracion de la API REST

Esta documentacion esta diseñada para desarrolladores que deseen consumir la API REST del Agente de Recursos Humanos desde cualquier aplicacion frontend (React, Next.js, Angular, aplicaciones moviles o scripts externos).

La API esta construida con FastAPI y cuenta con endpoints para consultar perfiles de cargos oficiales e invocar el agente de LangGraph para la generacion de cuestionarios de desempeño basados en la base de datos de vectores.

---

## Autenticacion (Hugging Face Spaces)

Si la API esta alojada en un Hugging Face Space Privado, todas las solicitudes HTTP deben incluir un token de lectura personal en las cabeceras.

### Cabecera de Autenticacion Requerida:
```http
Authorization: Bearer hf_TuTokenDeLecturaPersonalAqui
Content-Type: application/json
```

---

## Catálogo de Endpoints

### 1. Obtener Lista Oficial de Cargos
Retorna un listado de todos los cargos cuyos manuales de funciones oficiales han sido cargados e indexados en el sistema.

* **Ruta:** `/api/cargos`
* **Metodo:** `GET`
* **Cuerpo de la Peticion:** Vacio.

#### Ejemplo de Respuesta Exitosa (HTTP 200 OK):
```json
{
  "cargos": [
    "Analista de Infraestructura y Seguridad",
    "Coordinador de QA",
    "Desarrollador Backend",
    "Desarrollador Frontend"
  ]
}
```

---

### 2. Generar Cuestionario de Evaluacion
Genera un cuestionario de desempeño en escala Likert para un cargo especifico, aplicando el enfoque tecnico o de negocio suministrado.

* **Ruta:** `/api/evaluacion/generar`
* **Metodo:** `POST`
* **Cuerpo de la Peticion (JSON):**
  * `cargo` *(String, Requerido)*: El nombre exacto del cargo a evaluar (debe coincidir con uno de los devueltos por `/api/cargos`).
  * `enfoque` *(String, Opcional)*: El enfoque o pilar sobre el cual se construiran las preguntas. Valor por defecto: `"Desempeño general de funciones y responsabilidades"`.

#### Ejemplo de Cuerpo de Peticion (JSON):
```json
{
  "cargo": "Desarrollador Backend",
  "enfoque": "Trabajo bajo presion, metodologias agiles y resolucion de incidencias en produccion"
}
```

#### Ejemplo de Respuesta Exitosa (HTTP 200 OK):
```json
{
  "cargo": "Desarrollador Backend",
  "enfoque": "Trabajo bajo presion, metodologias agiles y resolucion de incidencias en produccion",
  "preguntas": "### Cuestionario de Evaluacion de Desempeño...\nPreguntas en escala Likert de 1 a 5 con justificacion..."
}
```

---

## Codigos de Respuesta y Manejo de Errores

* **HTTP 200 OK:** Solicitud procesada correctamente.
* **HTTP 400 Bad Request:** El cargo solicitado no esta registrado o es invalido.
* **HTTP 401 Unauthorized:** Cabecera de autenticacion faltante o token invalido.
* **HTTP 422 Unprocessable Entity:** El cuerpo JSON enviado no cumple con el formato requerido.
* **HTTP 500 Internal Server Error:** Ocurrio un error en el motor cognitivo interno del servidor.

---

## Implementacion de Referencia (Python)

Puedes utilizar este ejemplo base para integrar el consumo de la API dentro de tu codigo de cliente en Python:

```python
import os
import requests
from dotenv import load_dotenv

# Cargar la configuracion de variables de entorno
load_dotenv()

API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
HF_TOKEN = os.getenv("HF_TOKEN")

# Configurar cabeceras de conexion
headers = {
    "Content-Type": "application/json"
}
if HF_TOKEN:
    headers["Authorization"] = f"Bearer {HF_TOKEN}"

def probar_api():
    # 1. Obtener cargos indexados
    url_cargos = f"{API_BASE_URL}/api/cargos"
    try:
        response = requests.get(url_cargos, headers=headers, timeout=10)
        response.raise_for_status()
        cargos = response.json().get("cargos", [])
        print(f"Cargos disponibles: {cargos}")
        
        if cargos:
            # 2. Generar evaluacion para el primer cargo disponible
            url_generar = f"{API_BASE_URL}/api/evaluacion/generar"
            payload = {
                "cargo": cargos[0],
                "enfoque": "Eficiencia tecnica y metodologias de desarrollo"
            }
            res_generar = requests.post(url_generar, headers=headers, json=payload, timeout=60)
            res_generar.raise_for_status()
            print("\nResultado de Generacion:")
            print(res_generar.json().get("preguntas"))
            
    except Exception as e:
        print(f"Error de comunicacion con la API: {e}")

if __name__ == "__main__":
    probar_api()
```
