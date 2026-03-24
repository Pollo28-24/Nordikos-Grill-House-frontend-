# Guía para Reporte de Práctica 2: Cifrado AES-256

Este documento detalla los pasos técnicos realizados para implementar el cifrado de datos en reposo en el proyecto **Nordikos Grill House**.

## 🛠️ Tecnologías Utilizadas
- **Angular 20**: Framework del Frontend.
- **Supabase**: Base de datos y Autenticación.
- **Crypto-JS**: Librería para algoritmos criptográficos (AES-256).
- **Tailwind CSS**: Estilizado de la interfaz.

---

## 🚀 Paso a Paso de la Implementación

### 1. Preparación del Entorno
Se configuraron las credenciales criptográficas en los archivos de ambiente. AES-256 requiere una llave de 32 bytes y un IV de 16 bytes.
- **Archivos**: `src/environments/environment.ts` y `environment.development.ts`.
- **Variables**: `encryptionKey` y `encryptionIV`.

### 2. Creación del Servicio de Cifrado
Se implementó `EncryptionService` para centralizar la lógica.
- **Ubicación**: `src/app/core/services/encryption.service.ts`.
- **Método Encrypt**: Utiliza `CryptoJS.AES.encrypt` con modo CBC y Padding PKCS7.
- **Método Decrypt**: Utiliza `CryptoJS.AES.decrypt` para recuperar el texto original.

### 3. Modificación del Flujo de Registro (Frontend -> DB)
Para asegurar que los datos nunca toquen la base de datos en texto plano:
1. Se actualizó el formulario en `sign-up.ts` para incluir Teléfono y CURP.
2. En `auth.services.ts`, se modificó la función `signUp` para interceptar los datos.
3. Se aplica `this.encryptionService.encrypt(dato)` a los campos sensibles.
4. Los datos cifrados se envían a Supabase dentro del objeto `user_metadata`.

### 4. Recuperación y Descifrado
Para que el usuario pueda ver sus datos:
1. Se creó la ruta `/profile` y el componente `profile.ts`.
2. Al cargar el perfil, se obtienen los metadatos del usuario desde la sesión activa.
3. Se aplica `this.encryptionService.decrypt(dato_cifrado)` para mostrar la información real en la interfaz.

---

## 📸 Guía para Captura de Evidencias

### Evidencia 1: El Secreto en el entorno
- Abre `src/environments/environment.development.ts`.
- Toma captura donde se vean las líneas de `encryptionKey` y `encryptionIV`.

### Evidencia 2: El código de transformación
- **Cifrado**: Toma captura de `src/app/auth/data-access/auth.services.ts` en el método `signUp`.
- **Descifrado**: Toma captura de `src/app/pages/profile/profile.ts` en el método `ngOnInit`.

### Evidencia 3: Inspección de la Base de Datos
- Entra a Supabase -> Authentication -> Users.
- Haz clic en un usuario y busca la sección "User Metadata".
- Toma captura donde se vea que `telefono` y `curp` son cadenas largas y extrañas (Base64).

### Evidencia 4: Prueba de usuario
- Inicia sesión en la app.
- Ve a la sección "Mi Perfil" en el Navbar.
- Toma captura de la tarjeta de perfil donde aparecen el teléfono y CURP legibles.
