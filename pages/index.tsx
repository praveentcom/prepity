import jwt from "jsonwebtoken";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/router";
import { logout } from "@/lib/client/auth";
import { User } from "@prisma/client";

export default function Home({ user }: { user: User | null }) {
  const router = useRouter();
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-bold mb-4">Welcome to the App</h1>
          <div className="flex gap-4">
            <Button onClick={() => router.push("/auth/login")}>
              Log in
            </Button>
            <Button variant="outline" onClick={() => router.push("/auth/signup")}>
              Sign up
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Welcome, {user.name}!</h1>
        <Button variant="outline" onClick={handleLogout}>
          Log out
        </Button>
      </div>
      <p className="text-gray-600">This is the application homepage.</p>
    </div>
  );
}

export async function getServerSideProps(context: any) {
  const { req } = context;
  const token = req.cookies.token;

  if (!token) {
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as User;
    return {
      props: {
        user: decoded,
      },
    };
  } catch (error) {
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  }
}
