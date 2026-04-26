"use client";

import axios from "axios";
import { getSession } from "next-auth/react";

const fetchClient = () => {
  const instance = axios.create({
    baseURL: "/api",
  });

  instance.interceptors.request.use(async (config) => {
    const session = await getSession();
    if (session?.user) {
      config.headers["x-user-email"] = (session.user as { email?: string }).email ?? "";
    }
    return config;
  });

  return instance;
};

export default fetchClient();
