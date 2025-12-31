import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return (
    <div style={{ padding: 24, color: "white", fontFamily: "system-ui" }}>
      <h1>VRound</h1>
      <p>Si ves esto en fenomenolab.co/vround, ya está montando React ✅</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
