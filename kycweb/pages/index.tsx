import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import { VerifyComponent } from '../components/VerifyComponent'
import styles from '../styles/Home.module.css'
import { FirebaseApp, FirebaseAppSettings, FirebaseOptions, initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth'
import { useEffect, useState } from 'react'
// import { getAnalytics } from "firebase/analytics";
const Home: NextPage = () => {
  const [app,setApp] = useState<FirebaseApp|undefined>(undefined);
  // Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

  useEffect(()=>{
    const config = firebaseConfig();
    const app = initializeApp(config);
    console.assert(process.env.NEXT_PUBLIC_FB_API_KEY!==undefined,process.env.NEXT_PUBLIC_FB_API_KEY);
    setApp(app);
  }, [])
const firebaseConfig = ()=>( {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_authDomain, 
  projectId:  process.env.NEXT_PUBLIC_projectId,
  storageBucket: process.env.NEXT_PUBLIC_storageBucket, 
  messagingSenderId: process.env.NEXT_PUBLIC_messagingSenderId, 
  appId: process.env.NEXT_PUBLIC_appId,
})


  return (
    <div className={styles.container}>
      <Head>
        <title>Legato ID</title>
        <meta name="description" content="Generate a Legato ID" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="">
        <h1 className="">
          Legato ID Generator
        </h1>
        <p className={styles.description}>
          To mint songs, get paid and create disputes you need to verify your identity once through a 3rd party service called
          <code className={styles.code}>Persona</code>
        </p>

        <div className=''>
            <VerifyComponent fireApp={app as FirebaseApp}/>
        </div>
      </main>

      <footer className={''}>
      </footer>
    </div>
  )
}

export default Home
