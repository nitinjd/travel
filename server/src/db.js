import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
export const pool=mysql.createPool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,waitForConnections:true,connectionLimit:10,decimalNumbers:true,dateStrings:true});
export async function transaction(work){const c=await pool.getConnection();try{await c.beginTransaction();const result=await work(c);await c.commit();return result}catch(error){await c.rollback();throw error}finally{c.release()}}
