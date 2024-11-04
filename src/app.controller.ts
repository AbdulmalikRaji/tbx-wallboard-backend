import { Body, Controller, Get, Headers, Post, Req,HttpException, NotFoundException} from '@nestjs/common';
import { Request } from 'express';
import { AppService } from './app.service';
import { AxiosResponse } from 'axios';
import { map,catchError, throwError } from 'rxjs';
import { error } from 'console';



@Controller('api')
export class AppController  {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('auth/login')
  login(@Body() userInfo: {email:string,password:string}){
    return this.appService.login(userInfo.email,userInfo.password)
  }
  
  @Post('auth/logout')
  logout(@Headers() headers,@Req() req){
    return this.appService.logout(headers.authorization)
  }

  @Post('auth/verify/token')
  verifyToken(@Body() accessToken:{jwt_token:string}){
    return this.appService.verifyToken(accessToken.jwt_token)
  }
}
