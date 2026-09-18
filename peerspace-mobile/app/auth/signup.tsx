import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Easing } from "react-native"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "expo-router"

import { LinearGradient } from "expo-linear-gradient"

export default function Signup(){
  const router = useRouter()

  const [username,setUsername] = useState("")
  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")
  const [strength,setStrength] = useState("")

  const fadeAnim = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(40)).current

  useEffect(()=>{

    Animated.parallel([
      Animated.timing(fadeAnim,{
        toValue:1,
        duration:800,
        easing:Easing.out(Easing.exp),
        useNativeDriver:true
      }),
      Animated.timing(translateY,{
        toValue:0,
        duration:800,
        easing:Easing.out(Easing.exp),
        useNativeDriver:true
      })
    ]).start()

  },[])

  useEffect(()=>{

    if(password.length < 6) setStrength("Weak")
    else if(password.length < 10) setStrength("Medium")
    else setStrength("Strong")

  },[password])

  const signup = async ()=>{

    try{

      const res = await fetch("http://YOUR_IP:8000/auth/signup",{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          username,
          email,
          password
        })
      })

      const data = await res.json()

      console.log(data)

      router.replace("/auth/login")

    }catch(err){

      console.log(err)

    }

  }

  return(

    <View style={styles.container}>

      <View style={styles.glow1}/>
      <View style={styles.glow2}/>

      <Animated.View
      style={[
        styles.card,
        {
          opacity:fadeAnim,
          transform:[{translateY}]
        }
      ]}
      >

        <Text style={styles.title}>
          Create Account
        </Text>

        <Text style={styles.subtitle}>
          Join the PeerSpace community
        </Text>

        <TextInput
        placeholder="Username"
        placeholderTextColor="#666"
        style={styles.input}
        onChangeText={setUsername}
        />

        <TextInput
        placeholder="Email"
        placeholderTextColor="#666"
        style={styles.input}
        onChangeText={setEmail}
        />

        <TextInput
        placeholder="Password"
        placeholderTextColor="#666"
        secureTextEntry
        style={styles.input}
        onChangeText={setPassword}
        />

        {/* Password Strength */}

        <Text
        style={[
          styles.strength,
          strength === "Weak" && {color:"#ff4d4d"},
          strength === "Medium" && {color:"#ffb84d"},
          strength === "Strong" && {color:"#4dff88"}
        ]}
        >
          Password Strength: {strength}
        </Text>

        <TouchableOpacity
        activeOpacity={0.8}
        onPress={signup}
        >

          <LinearGradient
          colors={["#E947F5","#6C5DD3"]}
          start={{x:0,y:0}}
          end={{x:1,y:1}}
          style={styles.button}
          >

            <Text style={styles.buttonText}>
              Create Account
            </Text>

          </LinearGradient>

        </TouchableOpacity>

        <TouchableOpacity
        onPress={()=>router.push("/auth/login")}
        >

          <Text style={styles.loginText}>
            Already have an account? Login
          </Text>

        </TouchableOpacity>

      </Animated.View>

    </View>

  )
}

const styles = StyleSheet.create({

  container:{
    flex:1,
    justifyContent:"center",
    alignItems:"center",
    padding:24
  },

  glow1:{
    position:"absolute",
    width:260,
    height:260,
    borderRadius:200,
    backgroundColor:"#E947F5",
    opacity:0.12,
    top:100,
    left:-60
  },

  glow2:{
    position:"absolute",
    width:320,
    height:320,
    borderRadius:200,
    backgroundColor:"#6C5DD3",
    opacity:0.12,
    bottom:120,
    right:-80
  },

  card:{
    width:"100%",
    backgroundColor:"rgba(255,255,255,0.04)",
    borderRadius:18,
    padding:26,
    borderWidth:1,
    borderColor:"rgba(255,255,255,0.08)"
  },

  title:{
    color:"white",
    fontSize:28,
    fontWeight:"700",
    marginBottom:6
  },

  subtitle:{
    color:"#9aa0aa",
    marginBottom:26
  },

  input:{
    backgroundColor:"rgba(255,255,255,0.05)",
    borderRadius:12,
    padding:14,
    marginBottom:14,
    color:"white",
    borderWidth:1,
    borderColor:"rgba(255,255,255,0.06)"
  },

  strength:{
    marginBottom:12,
    fontSize:13
  },

  button:{
    padding:16,
    borderRadius:12,
    alignItems:"center",
    marginTop:10
  },

  buttonText:{
    color:"white",
    fontSize:16,
    fontWeight:"600"
  },

  loginText:{
    color:"#E947F5",
    marginTop:18,
    textAlign:"center"
  }

})