package com.smartproduct.service;

import com.smartproduct.shared.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.OAEPParameterSpec;
import javax.crypto.spec.PSource;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.spec.MGF1ParameterSpec;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class LoginCryptoService {
    private static final String TRANSFORMATION = "RSA/ECB/OAEPWithSHA-256AndMGF1Padding";
    private static final OAEPParameterSpec OAEP_SHA_256 = new OAEPParameterSpec(
            "SHA-256",
            "MGF1",
            MGF1ParameterSpec.SHA256,
            PSource.PSpecified.DEFAULT
    );

    private final KeyPair keyPair;

    public LoginCryptoService() {
        this.keyPair = generateKeyPair();
    }

    public Map<String, Object> publicKey() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("algorithm", "RSA-OAEP");
        result.put("hash", "SHA-256");
        result.put("publicKey", Base64.getEncoder().encodeToString(keyPair.getPublic().getEncoded()));
        return result;
    }

    public String decryptPassword(String encryptedPassword) {
        if (encryptedPassword == null || encryptedPassword.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "登录信息校验失败，请刷新页面后重试");
        }
        try {
            byte[] cipherText = Base64.getDecoder().decode(encryptedPassword);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, privateKey(), OAEP_SHA_256);
            return new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException | GeneralSecurityException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "登录信息校验失败，请刷新页面后重试");
        }
    }

    private PrivateKey privateKey() {
        return keyPair.getPrivate();
    }

    private static KeyPair generateKeyPair() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            return generator.generateKeyPair();
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Failed to initialize login encryption keys", ex);
        }
    }
}
