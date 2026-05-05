package com.smartproduct.infrastructure.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartproduct.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.LinkedHashMap;
import java.util.Map;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    private static final ObjectMapper JSON = new ObjectMapper();

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> {
                })
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/v1/data/user/login", "/data/**").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, ex) -> writeError(response, 401, "请重新登录"))
                        .accessDeniedHandler((request, response, ex) -> writeError(response, 403, "没有操作权限")))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    private static void writeError(jakarta.servlet.http.HttpServletResponse response, int status, String message) throws java.io.IOException {
        response.setStatus(status);
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json;charset=UTF-8");
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", status);
        body.put("message", message);
        response.getWriter().write(JSON.writeValueAsString(body));
    }
}
