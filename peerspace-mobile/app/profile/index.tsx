import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated } from "react-native"
import { useState, useRef, useEffect } from "react"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"

const router = useRouter()

export default function Profile(){

  const [username,setUsername] = useState("Ansh")
  const [bio,setBio] = useState("Building the future with AI")

  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(()=>{

    Animated.timing(fadeAnim,{
      toValue:1,
      duration:600,
      useNativeDriver:true
    }).start()

  },[])

  return(

    <Animated.View style={[styles.container,{opacity:fadeAnim}]}>

      {/* Profile Header */}

      <View style={styles.header}>

        <LinearGradient
        colors={["#E947F5","#6C5DD3"]}
        style={styles.avatar}
        >

          <Text style={styles.avatarText}>
            {username[0]}
          </Text>

        </LinearGradient>

        <Text style={styles.username}>
          {username}
        </Text>

      </View>

      {/* Editable Fields */}

      <View style={styles.section}>

        <Text style={styles.label}>
          Username
        </Text>

        <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        />

      </View>

      <View style={styles.section}>

        <Text style={styles.label}>
          Bio
        </Text>

        <TextInput
        style={styles.input}
        value={bio}
        onChangeText={setBio}
        multiline
        />

      </View>

      {/* Stats */}

      <View style={styles.statsContainer}>

        <View style={styles.stat}>

          <Text style={styles.statNumber}>
            12
          </Text>

          <Text style={styles.statLabel}>
            Communities
          </Text>

        </View>

        <View style={styles.stat}>

          <Text style={styles.statNumber}>
            348
          </Text>

          <Text style={styles.statLabel}>
            Messages
          </Text>

        </View>

      </View>

      {/* Buttons */}

      <TouchableOpacity activeOpacity={0.8}>

        <LinearGradient
        colors={["#E947F5","#6C5DD3"]}
        style={styles.saveButton}
        >

          <Text style={styles.buttonText}>
            Save Profile
          </Text>

        </LinearGradient>

      </TouchableOpacity>

      <TouchableOpacity
      style={styles.logout}
      onPress={()=>router.replace("/auth/login")}
      >

        <Ionicons name="log-out-outline" size={18} color="#ff6b6b"/>

        <Text style={styles.logoutText}>
          Logout
        </Text>

      </TouchableOpacity>

    </Animated.View>

  )

}

const styles = StyleSheet.create({

  container:{
    flex:1,
    padding:24
  },

  header:{
    alignItems:"center",
    marginBottom:30
  },

  avatar:{
    width:90,
    height:90,
    borderRadius:45,
    justifyContent:"center",
    alignItems:"center",
    marginBottom:12
  },

  avatarText:{
    color:"white",
    fontSize:32,
    fontWeight:"700"
  },

  username:{
    color:"white",
    fontSize:22,
    fontWeight:"600"
  },

  section:{
    marginBottom:18
  },

  label:{
    color:"#aaa",
    marginBottom:6
  },

  input:{
    backgroundColor:"#161824",
    padding:14,
    borderRadius:10,
    color:"white"
  },

  statsContainer:{
    flexDirection:"row",
    justifyContent:"space-around",
    marginVertical:24
  },

  stat:{
    alignItems:"center"
  },

  statNumber:{
    color:"white",
    fontSize:20,
    fontWeight:"700"
  },

  statLabel:{
    color:"#888"
  },

  saveButton:{
    padding:16,
    borderRadius:12,
    alignItems:"center"
  },

  buttonText:{
    color:"white",
    fontWeight:"600"
  },

  logout:{
    flexDirection:"row",
    alignItems:"center",
    justifyContent:"center",
    marginTop:18
  },

  logoutText:{
    color:"#ff6b6b",
    marginLeft:6
  }

})