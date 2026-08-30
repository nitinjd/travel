import jwt from 'jsonwebtoken';
export function requireAdmin(req,res,next){const token=req.headers.authorization?.replace(/^Bearer\s+/,'');if(!token)return res.status(401).json({message:'Admin login required'});try{req.admin=jwt.verify(token,process.env.JWT_SECRET);next()}catch{return res.status(401).json({message:'Invalid or expired login'})}}
export function signAdmin(admin){return jwt.sign({id:admin.id,email:admin.email,role:'admin'},process.env.JWT_SECRET,{expiresIn:'12h'})}
