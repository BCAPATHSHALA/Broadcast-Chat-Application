import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import ChatRoom from "./pages/ChatRoom";
import Home from "./pages/Home";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat/:roomCode" element={<ChatRoom />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
};

export default App;
