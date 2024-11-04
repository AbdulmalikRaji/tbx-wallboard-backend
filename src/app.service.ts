import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { map,Observable, from, catchError } from 'rxjs';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.env' });

@Injectable()
export class AppService {
  constructor(private readonly httpService: HttpService) {}
  authAPI = process.env.AUTH_API_URL;
  
  getHello(): string {
    return "port:"+process.env.PORT;
  }

  login(email:string,password:string){
    console.log("API LOGINNNNNNNNNN------");
    console.log(this.authAPI);

    const response = this.httpService.post(`${this.authAPI}/api/auth/login`, {
      email,
      password,
      app_code:"wallboard",
    }).pipe(
      map((res) => {return res.data}),
      catchError((error) => {
        console.error('Login error:', error);
        throw new NotFoundException;
      })
    )
    return response;

  }

  logout(access_bearer_token:string){
    try {
      const response = this.httpService.post(`${this.authAPI}/api/auth/logout`,{}, {
        headers:{
          'Authorization' : access_bearer_token
        }
      }).pipe(
        map((res) => {return res.data}),
        catchError((error) => {
          console.error('Logout error:', error);
          throw new UnauthorizedException;
        })
      )
      return response;
    } catch (error) {
      console.log("Logout error: "+error);
    }

  }

  verifyToken(jwt_token:string){
    try {
      const response = this.httpService.post(`${this.authAPI}/api/auth/verify/token`,{
        jwt_token
      }).pipe(
        map((res) => {return res.data}),
        catchError((error) => {
          console.error('token verification error:', error);
          throw new UnauthorizedException;
        })
      )
      return response;
    } catch (error) {
      console.log("Token verification error: "+error);
    }

  }
  
}
