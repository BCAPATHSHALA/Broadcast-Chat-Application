import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
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
import { useToast } from "../hooks/use-toast";
import { MessageCircle } from "lucide-react";

const schema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters long"),
  userName: z.string().min(1, "User name is required"),
});

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

export default function Home() {
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const createRoom = async () => {
    try {
      const response = await api.post("/create-room");
      if (response.data.roomCode) {
        setCreatedRoomCode(response.data.roomCode);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast({
          title: "Error",
          description:
            error.response?.data?.message ||
            "Failed to create room. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const onJoinRoom = (data: { roomCode: string; userName: string }) => {
    navigate(`/chat/${data.roomCode}`, { state: { userName: data.userName } });
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
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={createRoom}>
            Create New Room
          </Button>
          <form
            onSubmit={handleSubmit(onJoinRoom as () => void)}
            className="space-y-2"
          >
            <Input
              {...register("userName")}
              placeholder="Enter your name"
              className="w-full"
            />
            {errors.userName && (
              <p className="text-red-500 text-sm">
                {errors.userName.message as string}
              </p>
            )}
            <div className="flex justify-between gap-2">
              <Input
                {...register("roomCode")}
                placeholder="Enter Room Code"
                className="w-full"
              />
              <Button type="submit">Join Room</Button>
            </div>
            {errors.roomCode && (
              <p className="text-red-500 text-sm">
                {errors.roomCode.message as string}
              </p>
            )}
          </form>
        </CardContent>
        {createdRoomCode && (
          <CardFooter className="flex-col space-y-2">
            <div className="bg-gray-800 p-4 rounded-md text-center w-full">
              <p className="text-sm text-gray-400 mb-2">
                Share this code with your friend
              </p>
              <p className="text-xl font-bold text-white">{createdRoomCode}</p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(createdRoomCode);
                toast({
                  title: "Copied!",
                  description: "Room code copied to clipboard",
                });
              }}
            >
              Copy Room Code
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
