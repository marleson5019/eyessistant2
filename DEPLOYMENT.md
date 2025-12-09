# EYESSISTANT - GUIA DE DEPLOYMENT

## ✅ OPÇÃO 1: Online (GitHub Pages + Render)

### Frontend (GitHub Pages):
- ✅ Configurado automaticamente
- URL: https://marleson5019.github.io/eyessistant2
- Atualiza ao fazer `git push`

### Backend (Render - Gratuito):

1. Vá a https://render.com
2. Clique **"New +"** → **"Web Service"**
3. Conecte GitHub e selecione `eyessistant2`
4. Preencha:
   - **Name**: `eyessistant-backend`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Deploy!
6. Após terminar (3-5 min), copie a URL (ex: `https://eyessistant-backend.onrender.com`)
7. Atualize em `services/catarata-api.ts`:
   ```typescript
   const API_BASE_URL = 'https://eyessistant-backend.onrender.com';
   ```

---

## ✅ OPÇÃO 2: Localhost com Acesso Remoto (Plano B)

### Setup Rápido:

```powershell
cd C:\Users\marly\OneDrive\Desktop\Eyessistant

# Executar setup (baixa ngrok automaticamente)
powershell -ExecutionPolicy Bypass -File setup-local.ps1
```

### Executar (abrir 3 janelas):

**Janela 1 - Backend:**
```
.\start-backend.bat
```

**Janela 2 - Ngrok (expõe backend):**
```
.\expose-ngrok.bat
```
Copie a URL gerada (ex: `https://abc123.ngrok.io`)

**Janela 3 - Frontend:**
```
.\start-frontend.bat
```

### Configurar URL:

Edite `services/catarata-api.ts`:
```typescript
const API_BASE_URL = 'https://abc123.ngrok.io'; // cole aqui
```

### Acessar:

- **PC Local**: http://localhost:19006
- **Outro PC (WiFi)**: http://192.168.1.107:19006 (seu IP)
- **De Fora (Internet)**: Crie outro ngrok para porta 19006

---

## Troubleshooting

### Frontend: Asset 404
- Lidar cache: Ctrl+Shift+Del
- Recarregar: F5

### Backend: Conexão recusada
- Verificar se backend está rodando
- Verificar URL ngrok em catarata-api.ts
- CORS deve permitir origem

### Render: Build falha
- Remover pydantic (já feito)
- Verificar requirements.txt
- Logs em https://render.com/dashboard

---

**Status**: Online ✅ | Localhost ✅
