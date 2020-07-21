import express from "express"
import Config from "../../config"
import passport from "passport"
import {Strategy} from "passport-local"
import UserStorage from "../../data_storage/user_management/user_storage";
import NodeRSA from "node-rsa";
import fs from "fs";
import bcrypt from "bcrypt";
import Logger from "./../../logger"

export  function SetLocalAuthMethod(app: express.Application) {
    passport.use(new Strategy({passReqToCallback: true},(req, username, password, done) => {
        UserStorage.Instance.RetrieveByEmail(username)
            .then(result => {
                if(result.isError) return done(result.error)
                if(!result.value) return done("unable to login as provided user")


                const key = new NodeRSA(fs.readFileSync(Config.encryption_key_path));
                const encryptedPassword = key.encryptPrivate(password, "base64");

                if(encryptedPassword === result.value.password) return done(null, result.value)

                bcrypt.compare(password, result.value.password!)
                    .then((match) => {
                        if(match) return done(null, result.value)

                        return done(null, false)
                    })
                    .catch(e => {
                        Logger.error(`error comparing hashed passwords ${e}`)
                        return done(null,false);
                    })
           })
    }))
}
