export declare const generateToken: (id: string, role: "trainer" | "trainee") => string;
export declare const verifyToken: (token: string) => {
    id: string;
    role: "trainer" | "trainee";
};
//# sourceMappingURL=generateToken.d.ts.map