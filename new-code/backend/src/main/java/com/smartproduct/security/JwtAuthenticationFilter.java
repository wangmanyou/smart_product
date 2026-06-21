package com.smartproduct.security;

import com.smartproduct.service.TokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final TokenService tokens;
    private final SecurityUserService users;

    public JwtAuthenticationFilter(TokenService tokens, SecurityUserService users) {
        this.tokens = tokens;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())
                || "/v1/data/user/login".equals(path)
                || "/v1/data/user/login/key".equals(path)
                || path.startsWith("/data/")) {
            filterChain.doFilter(request, response);
            return;
        }
        String authorization = request.getHeader("Authorization");
        try {
            if (authorization != null && !authorization.isBlank()) {
                TokenService.TokenUser tokenUser = tokens.resolve(authorization);
                CurrentUser currentUser = users.load(tokenUser.userId());
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        currentUser,
                        null,
                        currentUser.permissions().stream().map(SimpleGrantedAuthority::new).toList()
                );
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ex) {
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"code\":401,\"message\":\"请重新登录\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }
}
