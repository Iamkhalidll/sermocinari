import { createParamDecorator} from "@nestjs/common";
import { AuthenticatedSocket } from "../middleware/ws-auth.middleware";

export const User = createParamDecorator(
    (data:AuthenticatedSocket)=>{
       return data.user; 
    }
);