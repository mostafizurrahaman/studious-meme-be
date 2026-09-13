
import axios from 'axios'
import config from '../config'
export const sendSms = async (number: string, otp: string) => { 
   const formData = new FormData()

   formData.set("token", config.otpToken!)
   formData.set("message", `(Malamal.com.bd) Your verification code is: ${otp}`)
   formData.set("to", number)
   try {
      const res = await axios.post("https://api.bdbulksms.net/api.php?json", formData)
      
      return res.data
   } catch (error) {
      console.log(error)
   }
}
