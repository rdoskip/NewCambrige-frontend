import axiosClient from "./axiosClient";

export const loginRequest = async (username, password) => {
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  const { data } = await axiosClient.post("/api/auth/token", formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data;
};

export const getMeRequest = () => axiosClient.get("/api/auth/me");

export const logoutRequest = () => axiosClient.post("/api/auth/logout");
