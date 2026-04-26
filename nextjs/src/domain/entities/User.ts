export interface User {
  _id?: string;
  email: string;
  username: string;
  password: string;
  passwordType: "md5" | "bcrypt";
  state?: string;
  belief?: string;
  moderator?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
