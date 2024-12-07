import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import { useToast } from "../hooks/use-toast";
import { MessageCircle } from "lucide-react";
import days from "dayjs";

const schema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
});

type Message = {
  sender: string;
  content: string;
  timestamp: string;
};

export default function ChatRoom() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const location = useLocation();
  const userName = location.state?.userName;
  const [messages, setMessages] = useState<Message[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register, handleSubmit, reset } = useForm({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    // Step 1 & 2: Send http request to server and get 101 response (Handshaking)
    const socket = new WebSocket("ws://localhost:5000");

    // Send string message with join_room and roomCode to the server for joining the room
    socket.onopen = () => {
      setWs(socket);
      socket.send(
        JSON.stringify({
          type: "join_room",
          payload: {
            roomCode: roomCode,
            userName: userName,
          },
        })
      );
    };

    // Listen for messages from the server
    socket.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data);
      console.log(type, payload);

      switch (type) {
        case "room_joined":
          console.log("ROOM-JOINED DATA:", payload);
          setMessages(payload.messages);
          break;
        case "user_joined":
          console.log("USER-JOINED DATA:", payload);
          setUserCount(payload.userCount);
          break;
        case "new_message":
          console.log("NEW-MESSAGE DATA:", payload);
          setMessages((prev) => [...prev, payload]);
          break;
        case "user_left":
          console.log("USER-LEFT DATA:", payload);
          setUserCount(payload.userCount);
          break;
        case "error":
          console.log("ERROR DATA:", payload);
          toast({
            title: "Error",
            description: payload.message,
            variant: "destructive",
          });
          navigate("/");
          break;
      }
    };

    return () => {
      socket.close(); // Close the socket when the component unmounts (User leaves the room)
    };
  }, [roomCode, navigate, toast, userName]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send string message first time to the user
  const onSendMessage = (data: { message: string }) => {
    if (ws) {
      ws.send(
        JSON.stringify({
          type: "send_message",
          payload: {
            sender: userName,
            content: data.message,
          },
        })
      );
      reset();
    }
  };

  return (
    <div className="container mx-auto flex justify-center items-center min-h-screen">
      <Card className="w-[600px]">
        <CardHeader>
          <CardTitle className="flex gap-2 items-center">
            <MessageCircle />
            Real Time Chat
          </CardTitle>
          <CardDescription>
            Temporary room that expires after all users exit
          </CardDescription>
          <div className="flex items-center justify-between shadow-sm border-b-2 p-4 rounded-md">
            <p>Chat Room: {roomCode}</p>
            <p>Users in room: {userCount}/10</p>
          </div>
        </CardHeader>

        <CardContent>
          <ScrollArea
            className="h-[400px] rounded-md border p-4"
            ref={scrollRef}
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-4 p-3 rounded-lg max-w-[80%] ${
                  msg.sender === userName
                    ? "ml-auto bg-slate-950 text-white"
                    : "bg-gray-700 text-white"
                }`}
              >
                <div className="text-sm opacity-70 mb-1">
                  {msg.sender === userName ? "You" : msg.sender}
                </div>
                <div>{msg.content}</div>
                <p className="text-[10px] text-right text-gray-500">
                  {days(msg.timestamp).format("dddd, MMMM D hh:mm A")}
                </p>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <form
            onSubmit={handleSubmit(onSendMessage as () => void)}
            className="flex w-full gap-2"
          >
            <Input
              {...register("message")}
              placeholder="Type your message..."
              className="flex-grow"
            />
            <Button type="submit">Send</Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
