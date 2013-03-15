package com.wavemaker.common;

import javax.servlet.http.HttpSession;

public class TestPubCredential {
    public String httpSessionId;

    public TestPubCredential(HttpSession httpSession) {
//        if (httpSession == null)
//            throw new NullPointerException();
        setSessionId(httpSession);
    }

    public void setSessionId(HttpSession httpSession) {
        if (httpSession != null) {
            this.httpSessionId = new String(httpSession.getId());
        }
    }
    
    @Override
    public int hashCode() {
        final int prime = 31;
        int result = 1;
        result = prime * result
                + ((httpSessionId == null) ? 0 : httpSessionId.hashCode());
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
        if (httpSessionId == null) {
            if (other.httpSessionId != null)
                return false;
        } else if (!httpSessionId.equals(other.httpSessionId))
            return false;
        return true;
    }

    @Override
    public String toString() {
         //return httpSession.toString();
        return "TestPubCredential [ sessionId=" + (httpSessionId != null ? httpSessionId : "(null)") + "]";
    }
}
