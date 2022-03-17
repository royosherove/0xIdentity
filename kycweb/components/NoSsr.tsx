/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable react/display-name */
// import dynamic from "next/dynamic";

// const LazyVerifyComponent = dynamic(() => {
//         return import('./VerifyComponent')} , { ssr: false }
//     );
// export default ()=> <LazyVerifyComponent/>;

import dynamic from "next/dynamic"
import React from "react"

const NoSsr = props => (
  <React.Fragment>{window?props.children:null}</React.Fragment>
)
export default dynamic(() => Promise.resolve(NoSsr), {
  ssr: false
})