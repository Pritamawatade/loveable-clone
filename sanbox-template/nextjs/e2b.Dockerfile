FROM node:21-slim

# Set non-interactive environment variables for sandbox
ENV CI=true
ENV npm_config_audit=false
ENV npm_config_fund=false

# Install curl
RUN apt-get update && apt-get install -y curl && apt-get clean && rm -rf /var/lib/apt/lists*

COPY compile_page.sh /compile_page.sh
RUN chmod +x /compile_page.sh

WORKDIR /home/user/nextjs-app

# Create Next.js app with non-interactive flags
RUN npx --yes create-next-app@latest . --yes --no-git --typescript --tailwind --eslint

# Initialize shadcn/ui with non-interactive flags
RUN npx --yes shadcn@latest init --preset mira --template next --yes --force

# Add all shadcn/ui components with non-interactive flags
RUN npx --yes shadcn@latest add --all --yes

# Move the Next.js app to the home directory and remove the nextjs-app directory
RUN mv /home/user/nextjs-app/* /home/user/ && rm -rf /home/user/nextjs-app