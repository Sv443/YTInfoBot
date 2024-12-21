import _axios from "axios";

export const axios = _axios.create({
  timeout: 8_000,
  maxRedirects: 3,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/133.0",
  },
});
