package com.wavemaker.common;

import javax.servlet.http.HttpSession;

public class TestPubCredential {
    public HttpSession httpSession;

    public TestPubCredential(HttpSession httpSession) {
        this.httpSession = httpSession;
    }

    @Override
    public int hashCode() {
        final int prime = 31;
        int result = 1;
        result = prime * result
                + ((httpSession == null) ? 0 : httpSession.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj)
            return true;
        if (obj == null)
            return false;
        if (getClass() != obj.getClass())
            return false;
        TestPubCredential other = (TestPubCredential) obj;
        if (httpSession == null) {
            if (other.httpSession != null)
                return false;
        } else if (!httpSession.equals(other.httpSession))
            return false;
        return true;
    }

    @Override
    public String toString() {
        return httpSession.toString();
    }
}
