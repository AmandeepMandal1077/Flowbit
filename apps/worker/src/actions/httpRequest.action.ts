const makeHttpRequest = async (payload: HttpRequestInput) => {
    const response = await fetch(payload.url);
    const data = await response.json();

    return {
        data
    };
}

const HttpRequestConfig = {
    url: {
        type: "string",
        required: true,
    }
}


export {
    makeHttpRequest,
    HttpRequestConfig,
}