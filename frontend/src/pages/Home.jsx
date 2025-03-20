import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";

const Home = () => {
    return (
        <Layout
            leftSection={<div>Left Section</div>}
            rightSection={<div>Right Section</div>}
        />
    );
}

export default Home;