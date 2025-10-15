import { useState, useRef, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import QrScanner from "qr-scanner";

function App() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [cabinetId, setCabinetId] = useState<string>("GT042241005801");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  const getToken = async () => {
    try {
      const tokenResponse = await fetch(
        "https://api.w-dian.cn/operate/auth/login?ocode=quick",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "admin",
            password: "111111",
          }),
        }
      );

      const tokenData = await tokenResponse.json();
      console.log("Token response:", tokenData);

      if (tokenData.code === 1 && tokenData.data?.token) {
        setToken(tokenData.data.token);
        return tokenData.data.token;
      } else {
        throw new Error("Не удалось получить токен");
      }
    } catch (error) {
      console.error("Ошибка получения токена:", error);
      throw error;
    }
  };

  const borrowDevice = async () => {
    setLoading(true);
    setResponse("");

    try {
      // Получаем токен если его нет
      let currentToken = token;
      if (!currentToken) {
        currentToken = await getToken();
      }

      // Генерация уникальных ID
      const lockId = Date.now() + Math.floor(Math.random() * 1000);
      const orderNo = Date.now() + Math.floor(Math.random() * 10000);

      const requestBody = {
        cabinet_id: cabinetId,
        type: "borrow",
        lock_id: lockId,
        order_no: orderNo,
      };

      console.log("Отправка запроса:", requestBody);

      const res = await fetch(
        "https://api.w-dian.cn/operate/equipment/operate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: currentToken,
            ocode: "quick",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await res.json();
      console.log("Ответ:", data);
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Ошибка:", error);
      setResponse(`Ошибка: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const startScanning = async () => {
    try {
      if (!videoRef.current) return;

      // Проверяем доступность камеры
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Камера не доступна в этом браузере");
        return;
      }

      // Проверяем HTTPS (кроме localhost для разработки)
      if (
        location.protocol !== "https:" &&
        location.hostname !== "localhost" &&
        location.hostname !== "127.0.0.1"
      ) {
        alert("Для работы камеры требуется HTTPS соединение");
        return;
      }

      const qrScanner = new QrScanner(
        videoRef.current,
        (result) => {
          console.log("QR Code detected:", result.data);
          setCabinetId(result.data);
          stopScanning();
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: "environment", // Используем заднюю камеру на мобильных
          maxScansPerSecond: 5,
        }
      );

      qrScannerRef.current = qrScanner;
      await qrScanner.start();
      setIsScanning(true);
      console.log("QR Scanner started successfully");
    } catch (error) {
      console.error("Error starting QR scanner:", error);

      // Более детальная обработка ошибок
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          alert(
            "Доступ к камере запрещен. Разрешите доступ к камере в настройках браузера."
          );
        } else if (error.name === "NotFoundError") {
          alert(
            "Камера не найдена. Убедитесь, что камера подключена и работает."
          );
        } else if (error.name === "NotSupportedError") {
          alert("QR сканирование не поддерживается в этом браузере.");
        } else {
          alert(`Ошибка запуска камеры: ${error.message}`);
        }
      } else {
        alert("Неизвестная ошибка при запуске камеры");
      }
    }
  };

  const stopScanning = () => {
    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
        console.log("QR Scanner stopped successfully");
      } catch (error) {
        console.error("Error stopping QR scanner:", error);
      }
      qrScannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>

      <div className="card">
        <h2>Управление устройством</h2>

        {token && (
          <div
            style={{ marginBottom: "15px", fontSize: "14px", color: "#666" }}
          >
            <strong>Токен получен:</strong> {token.substring(0, 20)}...
          </div>
        )}

        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Cabinet ID:
          </label>
          <input
            type="text"
            value={cabinetId}
            onChange={(e) => setCabinetId(e.target.value)}
            placeholder="Введите или отсканируйте QR-код"
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "14px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              maxWidth: "300px",
            }}
          />
          <div style={{ marginTop: "10px" }}>
            <button
              onClick={isScanning ? stopScanning : startScanning}
              style={{
                backgroundColor: isScanning ? "#f44336" : "#2196F3",
                color: "white",
                padding: "8px 16px",
                fontSize: "14px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                marginRight: "10px",
              }}
            >
              {isScanning ? "Остановить сканирование" : "Сканировать QR-код"}
            </button>
          </div>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
            {isScanning
              ? "Наведите камеру на QR-код устройства"
              : "Отсканируйте QR-код устройства или введите ID вручную"}
          </div>
        </div>

        {isScanning && (
          <div style={{ marginBottom: "15px" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <video
                ref={videoRef}
                style={{
                  width: "100%",
                  maxWidth: "300px",
                  border: "2px solid #2196F3",
                  borderRadius: "4px",
                  backgroundColor: "#000",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "10px",
                  backgroundColor: "rgba(0,0,0,0.7)",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
              >
                🔍 Сканирование...
              </div>
            </div>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
              Наведите камеру на QR-код устройства
            </div>
          </div>
        )}

        <button
          onClick={borrowDevice}
          disabled={loading || !cabinetId}
          style={{
            backgroundColor: cabinetId ? "#4CAF50" : "#cccccc",
            color: "white",
            padding: "12px 24px",
            fontSize: "16px",
            cursor: loading || !cabinetId ? "not-allowed" : "pointer",
            opacity: loading || !cabinetId ? 0.6 : 1,
          }}
        >
          {loading ? "Загрузка..." : "Взять устройство"}
        </button>

        {response && (
          <div
            style={{
              marginTop: "20px",
              textAlign: "left",
              backgroundColor: "#2d3748",
              color: "#ffffff",
              padding: "15px",
              borderRadius: "5px",
              maxWidth: "600px",
              margin: "20px auto",
            }}
          >
            <h3 style={{ color: "#ffffff", marginBottom: "10px" }}>
              Ответ сервера:
            </h3>
            <pre
              style={{
                overflow: "auto",
                fontSize: "14px",
                whiteSpace: "pre-wrap",
                color: "#ffffff",
                backgroundColor: "#1a202c",
                padding: "10px",
                borderRadius: "3px",
              }}
            >
              {response}
            </pre>
          </div>
        )}
      </div>

      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
