import LoginButton from "./components/LoginButton";
import axios from "axios";

async function getUsers() {
  try {
    const response = await axios.get("http://localhost:3001/users");
    return response.data;
  } catch (error) {
    console.error("Error fetching users", error);
    return [];
  }
}

export default async function Home() {
  const users = await getUsers();

  return (
    <div>
      <LoginButton />
      <h1>Users</h1>
      <ul>
        {users.map((user: any) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
